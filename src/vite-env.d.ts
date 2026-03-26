/// <reference types="vite/client" />

declare module '*.glsl' {
  const src: string;
  export default src;
}

declare module '*.vert' {
  const src: string;
  export default src;
}

declare module '*.frag' {
  const src: string;
  export default src;
}

declare module 'troika-three-text' {
  import { Object3D, Material, Color } from 'three';
  export class Text extends Object3D {
    text: string;
    font: string;
    fontSize: number;
    position: any;
    color: number | string | Color;
    material: Material;
    lineHeight: number;
    sync(): void;
    dispose(): void;
  }
}

