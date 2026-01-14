export interface VirtualElement {
  type: string;
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
  type: string;
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
}
