import { Fiber, VirtualElement } from './type';

// ============ 全局变量 ============

// 下一个要处理的工作单元（Fiber）
let nextUnitOfWork: Fiber | null = null;

// 正在构建的 Fiber 树的根节点
let wipRoot: Fiber | null = null;

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
  };

  // 2. 设置第一个工作单元
  nextUnitOfWork = wipRoot;

  // 3. 启动工作循环
  requestIdleCallback(workLoop);
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

  // 2️. 为子元素创建 Fiber
  const children = fiber.props.children;
  let preSibling: Fiber | null = null;

  for (let i = 0; i < children.length; i++) {
    const childElement = children[i];

    // 创建新的 Fiber 节点
    const newFiber: Fiber = {
      type: childElement?.type ?? '',
      props: childElement?.props ?? { children: [] },
      dom: null,
      parent: fiber,
      child: null,
      sibling: null,
    };

    // 建立链表关系
    if (i === 0) {
      // 第一个子 Fiber 节点作为父 Fiber 的子 Fiber 节点
      fiber.child = newFiber;
    } else {
      // 其他子 Fiber 节点作为前一个子 Fiber 节点的兄弟 Fiber 节点
      if (preSibling) {
        preSibling.sibling = newFiber;
      }
    }

    // 更新 preSibling 为当前 Fiber 节点
    preSibling = newFiber;
  }

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
  if (parentDom && fiber.dom) {
    parentDom.appendChild(fiber.dom);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitRoot() {
  if (wipRoot?.child) {
    commitWork(wipRoot.child);
  }
  wipRoot = null;
}
