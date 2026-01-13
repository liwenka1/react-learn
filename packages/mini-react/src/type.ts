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
