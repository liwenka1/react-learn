import { Fiber, FunctionComponent, Hook, VirtualElement } from './type';

// ============ 全局变量 ============

// 下一个要处理的工作单元（Fiber）
let nextUnitOfWork: Fiber | null = null;

// 正在构建的 Fiber 树的根节点
let wipRoot: Fiber | null = null;

// 上次提交的 Fiber 树的根节点
let currentRoot: Fiber | null = null;

// 需要删除的 Fiber 节点
let deletions: Fiber[] = [];

// 当前正在渲染的函数组件 Fiber
let wipFiber: Fiber | null = null;

// 当前 Hook 的索引
let hookIndex: number = 0;

// ============ 辅助函数：创建 DOM ============

const isEvent = (key: string) => key.startsWith('on');

const isProperty = (key: string) => key !== 'children' && !isEvent(key);

const eventName = (key: string) => key.toLowerCase().substring(2);

function createDom(fiber: Fiber): HTMLElement | Text {
  // 如果是文本节点
  if (fiber.type === 'TEXT_ELEMENT') {
    return document.createTextNode(String(fiber.props.nodeValue ?? ''));
  }

  // 普通元素节点（这里 fiber.type 一定是 string，因为函数组件不会调用 createDom）
  const dom = document.createElement(fiber.type as string);

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
    hooks: [],
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
        hooks: [],
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
        hooks: [],
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

// ============ 处理原生 DOM 元素 ============

function updateHostComponent(fiber: Fiber) {
  // 1. 创建 DOM（如果还没有）
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // 2. 协调子节点
  reconcileChildren(fiber, fiber.props.children);
}

// ============ 处理函数组件 ============

function updateFunctionComponent(fiber: Fiber) {
  // 1. 设置全局变量，让 useState 知道当前在渲染哪个组件
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];

  // 2. 调用函数组件，获取子元素
  //    这里 fiber.type 是函数，比如 Counter
  //    调用它：Counter(props) 返回 VirtualElement
  const children = [(fiber.type as FunctionComponent)(fiber.props)];

  // 3. 协调子节点
  reconcileChildren(fiber, children);
}

// ============ performUnitOfWork：处理单个 Fiber ============

function performUnitOfWork(fiber: Fiber): Fiber | null {
  // 判断是函数组件还是原生元素
  const isFunctionComponent = typeof fiber.type === 'function';

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  // 返回下一个工作单元
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

function updateDom(
  dom: HTMLElement | Text,
  prevProps: { [key: string]: any },
  nextProps: { [key: string]: any }
) {
  // 特殊处理：文本节点
  if (dom instanceof Text) {
    if (prevProps.nodeValue !== nextProps.nodeValue) {
      dom.nodeValue = String(nextProps.nodeValue ?? '');
    }
    return;
  }

  // 1. 移除旧的事件监听（旧的有，新的没有，或者值变了）
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || prevProps[key] !== nextProps[key])
    .forEach((name) => {
      const eventType = eventName(name);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // 2. 移除旧的属性（旧的有，新的没有）
  Object.keys(prevProps)
    .filter(isProperty)
    .filter((key) => !(key in nextProps))
    .forEach((name) => {
      (dom as HTMLElement).removeAttribute(name);
    });

  // 3. 设置新的属性（新的有，和旧的不同）
  Object.keys(nextProps)
    .filter(isProperty)
    .filter((key) => prevProps[key] !== nextProps[key])
    .forEach((name) => {
      (dom as HTMLElement).setAttribute(name, nextProps[name]);
    });

  // 4. 添加新的事件监听（新的有，旧的没有，或者值变了）
  Object.keys(nextProps)
    .filter(isEvent)
    .filter((key) => prevProps[key] !== nextProps[key])
    .forEach((name) => {
      const eventType = eventName(name);
      dom.addEventListener(eventType, nextProps[name]);
    });
}

// 向上查找有 DOM 的父级 Fiber
function getParentDom(fiber: Fiber): HTMLElement | Text | null {
  let parent = fiber.parent;
  while (parent) {
    if (parent.dom) {
      return parent.dom;
    }
    parent = parent.parent;
  }
  return null;
}

// 向下查找有 DOM 的子级 Fiber 并删除
function commitDeletion(fiber: Fiber, parentDom: HTMLElement | Text) {
  if (fiber.dom) {
    parentDom.removeChild(fiber.dom);
  } else if (fiber.child) {
    // 函数组件没有 DOM，继续找子节点
    commitDeletion(fiber.child, parentDom);
  }
}

function commitWork(fiber: Fiber | null) {
  if (!fiber) return;

  // 函数组件没有 DOM，需要向上找有 DOM 的父级
  const parentDom = getParentDom(fiber);

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom) {
    parentDom?.appendChild(fiber.dom);
  }
  if (fiber.effectTag === 'UPDATE' && fiber.dom) {
    updateDom(fiber.dom, fiber.alternate?.props ?? {}, fiber.props);
  }
  if (fiber.effectTag === 'DELETION') {
    if (parentDom) {
      commitDeletion(fiber, parentDom);
    }
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

// ============ useState ============

export function useState<T>(
  initialState: T
): [T, (action: T | ((prev: T) => T)) => void] {
  // 1. 获取旧的 Hook（如果有的话，从 alternate 上取）
  const oldHook = wipFiber?.alternate?.hooks?.[hookIndex];

  // 2. 创建新的 Hook
  const hook: Hook = {
    // 如果有旧 Hook，复用旧状态；否则用初始值
    state: oldHook ? oldHook.state : initialState,
    // 更新队列，存放本次渲染期间所有的 setState 调用
    queue: [],
  };

  // 3. 执行上一次渲染期间积累的所有更新
  //    （这些更新是上次 setState 放进去的）
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action: T | ((prev: T) => T)) => {
    // action 可能是值，也可能是函数
    if (typeof action === 'function') {
      hook.state = (action as (prev: T) => T)(hook.state);
    } else {
      hook.state = action;
    }
  });

  // 4. 定义 setState 函数
  const setState = (action: T | ((prev: T) => T)) => {
    // 把 action 放入队列
    hook.queue.push(action);

    // 触发重新渲染（和 render 函数类似的逻辑）
    wipRoot = {
      type: currentRoot?.type ?? '',
      props: currentRoot?.props ?? { children: [] },
      dom: currentRoot?.dom ?? null,
      parent: null,
      child: null,
      sibling: null,
      alternate: currentRoot ?? null,
      hooks: [],
    };
    nextUnitOfWork = wipRoot;
    deletions = [];

    // 启动工作循环
    requestIdleCallback(workLoop);
  };

  // 5. 把 Hook 存入当前 Fiber
  wipFiber!.hooks.push(hook);
  hookIndex++;

  // 6. 返回 [state, setState]
  return [hook.state, setState];
}
