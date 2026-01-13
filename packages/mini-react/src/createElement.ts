import { Props, VirtualElement } from './type';

export function createElement(
  type: string,
  props: Props | null,
  ...children: any[]
): VirtualElement {
  return {
    type,
    props: {
      ...(props || {}),
      children: children
        .filter((child) => child != null && typeof child != 'boolean')
        .map((child) =>
          typeof child === 'object' ? child : createTextElement(child)
        ),
    },
  };
}

function createTextElement(text: string | number): VirtualElement {
  return { type: 'TEXT_ELEMENT', props: { nodeValue: text, children: [] } };
}
