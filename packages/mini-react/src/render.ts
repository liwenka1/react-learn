import { VirtualElement } from './type';

const isEvent = (key: string) => key.startsWith('on');

const isProperty = (key: string) => key !== 'children' && !isEvent(key);

const eventName = (key: string) => key.toLowerCase().substring(2);

export function render(element: VirtualElement, container: HTMLElement | Text) {
  // 1. 创建 DOM 节点
  const dom =
    element.type === 'TEXT_ELEMENT'
      ? document.createTextNode(String(element.props.nodeValue ?? ''))
      : document.createElement(element.type);

  //2. 设置属性
  if (element.type !== 'TEXT_ELEMENT' && dom instanceof HTMLElement) {
    Object.keys(element.props).forEach((name) => {
      if (isProperty(name)) {
        dom.setAttribute(name, element.props[name]);
      }
      if (isEvent(name)) {
        dom.addEventListener(eventName(name), element.props[name]);
      }
    });
  }

  //3. 递归渲染子元素
  element.props.children.forEach((child) => {
    render(child, dom);
  });

  //4. 插入 DOM 节点
  container.appendChild(dom);
}
