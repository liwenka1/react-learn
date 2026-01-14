import { Fiber, VirtualElement } from './type';

// ============ 全局变量 ============

// 下一个要处理的工作单元（Fiber）
let nextUnitOfWork: Fiber | null = null;

// 正在构建的 Fiber 树的根节点
let wipRoot: Fiber | null = null;

// 上次提交的 Fiber 树的根节点
let currentRoot: Fiber | null = null;

// 需要删除的 Fiber 节点
let deletions: Fiber[] = [];

// ============ 辅助函数：创建 DOM ============

const isEvent = (key: string) => key.startsWith('on');

const isProperty = (key: string) => key !== 'children' && !isEvent(key);

const eventName = (key: string) => key.toLowerCase().substring(2);

function createDom(fiber: Fiber): HTMLElement | Text {
  // 如果是文本节点
  if (fiber.type === 'TEXT_ELEMENT') {
    return document.createTextNode(String(fiber.props.nodeValue ?? ''));
  }

  // 普通元素节点
  const dom = document.createElement(fiber.type);

  // 设置属性
  Object.keys(fiber.props).forEach((name) => {
    if (isProperty(name)) {
      dom.setAttribute(name, fiber.props[name]);
    }
    if (isEvent(name)) {
      dom.addEventListener(eventName(name), fiber.props[name]);
    }
  });

  return dom;
}

// ============ render 函数 ============

export function render(element: VirtualElement, container: HTMLElement) {
  // 1. 创建根 Fiber
  wipRoot = {
    type: 'ROOT',
    props: {
      children: [element],
    },
    dom: container,
    parent: null,
    child: null,
    sibling: null,
    alternate: currentRoot,
  };

  // 2. 设置第一个工作单元
  nextUnitOfWork = wipRoot;

  deletions = [];

  // 3. 启动工作循环
  requestIdleCallback(workLoop);
}

// ============ reconcileChildren：协调子节点 ============

function reconcileChildren(wipFiber: Fiber, elements: VirtualElement[]) {
  let index = 0;

  // 获取旧 Fiber 的第一个子节点（用于对比）
  let oldFiber = wipFiber.alternate?.child ?? null;

  let prevSibling: Fiber | null = null;

  // 遍历：只要还有新元素 或 还有旧 Fiber
  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber: Fiber | null = null;

    // 判断类型是否相同
    const sameType = oldFiber && element && oldFiber.type === element.type;

    // 情况1：类型相同 → UPDATE（复用 DOM）
    if (sameType && oldFiber && element) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        child: null,
        sibling: null,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      };
    }

    // 情况2：有新元素但类型不同（或没有旧节点） → PLACEMENT（新增）
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        child: null,
        sibling: null,
        alternate: null,
        effectTag: 'PLACEMENT',
      };
    }

    // 情况3：有旧节点但类型不同（或没有新元素） → DELETION（删除）
    if (oldFiber && !sameType) {
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber);
    }

    // 移动 oldFiber 指针
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    // 建立链表关系（和之前一样）
    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (newFiber && prevSibling) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
}

// ============ workLoop：工作循环 ============

function workLoop(deadline: IdleDeadline) {
  // 1. 循环处理工作单元
  while (nextUnitOfWork && deadline.timeRemaining() > 1) {
    // 处理当前 Fiber，返回下一个
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }

  // 2. 如果所有工作完成，且有 wipRoot，进入 Commit 阶段
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  // 3. 如果还有工作，继续调度
  if (nextUnitOfWork) {
    requestIdleCallback(workLoop);
  }
}
// ============ performUnitOfWork：处理单个 Fiber ============

function performUnitOfWork(fiber: Fiber): Fiber | null {
  // 1️. 创建 DOM
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // 2️. 协调子节点
  reconcileChildren(fiber, fiber.props.children);

  // 3️. 返回下一个工作单元
  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber: Fiber | null = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
  return null;
}
// ============ commitRoot：提交阶段 ============

function commitWork(fiber: Fiber | null) {
  if (!fiber) return;

  const parentDom = fiber.parent?.dom;

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom) {
    parentDom?.appendChild(fiber.dom);
  }
  if (fiber.effectTag === 'UPDATE' && fiber.dom) {
    // todo: 更新 DOM
  }
  if (fiber.effectTag === 'DELETION' && fiber.dom) {
    parentDom?.removeChild(fiber.dom);
    return;
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitRoot() {
  // 删除 DOM
  deletions.forEach((fiber) => {
    if (fiber.dom) {
      fiber.parent?.dom?.removeChild(fiber.dom);
    }
  });

  // 提交所有 DOM
  if (wipRoot?.child) {
    commitWork(wipRoot.child);
  }

  // 保存当前树，供下次更新对比用
  currentRoot = wipRoot;

  // 清空 wipRoot
  wipRoot = null;
}
