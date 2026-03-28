import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

const resizeHandlers = new WeakMap<WebGLRenderer, () => void>();

export interface CreateBloomWebGLRendererOptions {
  container: HTMLElement;
  antialias?: boolean;
  /** Caps `devicePixelRatio` for thermal / bandwidth. */
  maxPixelRatio?: number;
  transmissionResolutionScale?: number;
  /** Linear sRGB clear (e.g. 0x020617). */
  clearColor?: number;
}

/**
 * WebGL2 renderer configured for HDR post (half-float targets assumed by {@link CitronBloomComposer}).
 */
export function createBloomWebGLRenderer(options: CreateBloomWebGLRendererOptions): WebGLRenderer {
  const {
    container,
    antialias = true,
    maxPixelRatio = 2,
    transmissionResolutionScale = 1,
    clearColor = 0x020617,
  } = options;

  const renderer = new WebGLRenderer({
    antialias,
    powerPreference: 'high-performance',
    stencil: false,
  });

  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.transmissionResolutionScale = transmissionResolutionScale;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setClearColor(clearColor, 1);

  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  const resizeToContainer = (): void => {
    const { width, height } = container.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio, maxPixelRatio);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
  };

  resizeToContainer();
  resizeHandlers.set(renderer, resizeToContainer);

  return renderer;
}

export function resizeBloomRendererToContainer(renderer: WebGLRenderer): void {
  resizeHandlers.get(renderer)?.();
}
