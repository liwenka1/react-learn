// 临时直接导入源码，因为还没有编译 dist
import { createElement } from '@react-learn/mini-react';

console.log('=== Mini React 测试 ===\n');

// 测试1：简单元素
const test1 = createElement('h1', null, 'Hello World');
console.log('测试1 - 简单元素:');
console.log(JSON.stringify(test1, null, 2));
console.log('\n');

// 测试2：带属性
const test2 = createElement(
  'div',
  { id: 'app', className: 'container' },
  'Content'
);
console.log('测试2 - 带属性:');
console.log(JSON.stringify(test2, null, 2));
console.log('\n');

// 测试3：嵌套元素
const test3 = createElement(
  'div',
  null,
  createElement('h1', null, 'Title'),
  createElement('p', null, 'Description')
);
console.log('测试3 - 嵌套元素:');
console.log(JSON.stringify(test3, null, 2));
console.log('\n');

// 测试4：混合 children（文本、数字、布尔、null）
const test4 = createElement(
  'div',
  null,
  'Text',
  42,
  true,
  false,
  null,
  undefined,
  createElement('span', null, 'End')
);
console.log('测试4 - 混合 children:');
console.log(JSON.stringify(test4, null, 2));
