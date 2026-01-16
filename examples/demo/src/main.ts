/**
 * Mini React 渲染测试 - useState
 */
import {
  createElement,
  renderWithFiber,
  useState,
} from '@react-learn/mini-react';

// 函数组件：计数器
function Counter() {
  const [count, setCount] = useState(0);

  return createElement(
    'div',
    { id: 'counter' },
    createElement('h1', null, 'Mini React Counter'),
    createElement('p', null, '当前计数: ', count),
    createElement(
      'button',
      {
        onclick: () => setCount(count + 1),
      },
      '点击 +1'
    ),
    createElement(
      'button',
      {
        onclick: () => setCount((prev: number) => prev + 10),
        style: 'margin-left: 10px',
      },
      '点击 +10 (函数式)'
    )
  );
}

// 获取容器
const container = document.getElementById('root');

if (container) {
  // 渲染函数组件
  const app = createElement(Counter, null);
  renderWithFiber(app, container);

  // eslint-disable-next-line no-console
  console.log('Counter 组件已渲染！');
}
