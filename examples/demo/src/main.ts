/**
 * Mini React 渲染测试
 */
import { createElement, render } from '@react-learn/mini-react';

// 测试1：简单元素
const element = createElement(
  'div',
  { id: 'app' },
  createElement('h1', null, 'Hello Mini React! 🎉'),
  createElement(
    'p',
    null,
    '这是用我们自己写的 createElement 和 render 渲染的！'
  ),
  createElement(
    'button',
    {
      onclick: () => {
        window.alert('按钮被点击了！');
      },
    },
    '点击我'
  )
);

// 获取容器
const container = document.getElementById('root');

if (container) {
  // 渲染！
  render(element, container);
  // eslint-disable-next-line no-console
  console.log('渲染完成！虚拟 DOM:', element);
}
