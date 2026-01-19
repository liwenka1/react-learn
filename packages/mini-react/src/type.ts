export interface VirtualElement {
  type: string | FunctionComponent;
  props: {
    [key: string]: any;
    children: VirtualElement[];
  };
}

export interface Props {
  [key: string]: any;
  children?: VirtualElement[];
}

export interface Fiber {
  type: string | FunctionComponent;
  props: {
    [key: string]: any;
    children: VirtualElement[];
  };

  parent: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;

  dom: HTMLElement | Text | null;

  alternate: Fiber | null;
  effectTag?: 'PLACEMENT' | 'UPDATE' | 'DELETION';

  hooks: Hook[];
}

export interface FunctionComponent {
  (props: Props): VirtualElement;
}

export interface Hook {
  state: any; // 存储状态值
  queue: any[]; // 更新队列，存放 setState 的参数
}
