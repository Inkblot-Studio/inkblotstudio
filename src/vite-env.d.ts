/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Web3Forms access key (free tier). Overrides data-access-key on #contact-form when set. */
  readonly VITE_WEB3FORMS_ACCESS_KEY?: string;
  /** When `"true"`, contact form does not call Web3Forms (see `src/config/contactForm.config.ts`). */
  readonly VITE_CONTACT_FORM_DRY_RUN?: string;
}

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

