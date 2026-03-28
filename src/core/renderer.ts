import {
  WebGLRenderer,
  ACESFilmicToneMapping,
  SRGBColorSpace,
  HalfFloatType,
  PCFSoftShadowMap,
} from 'three';
import { COLORS } from '@/utils/colors';
import type { ViewportSize } from '@/types';

export interface RendererOptions {
  container: HTMLElement;
  antialias?: boolean;
  /** Device pixel ratio cap — prevents GPU over-stress on high-DPI screens. */
  maxPixelRatio?: number;
  /**
   * Scales the internal buffer used for mesh transmission (glass). 1 = sharpest;
   * lower values save GPU on medium/low bloom LOD when physical glass is active.
   */
  transmissionResolutionScale?: number;
}

/**
 * Central WebGL renderer wrapper.
 *
 * - Physically-correct lighting via ACESFilmic tone mapping
 * - Half-float render targets for HDR postprocessing headroom
 * - Background clear color: #020617 (PALETTE.background)
 * - Soft shadow maps enabled by default
 *
 * WebGPU path: when Three.js WebGPURenderer stabilises, swap the
 * constructor here — the rest of the codebase consumes the same API.
 */
export class InkblotRenderer {
  readonly instance: WebGLRenderer;
  private readonly container: HTMLElement;
  private readonly maxPixelRatio: number;

  constructor({
    container,
    antialias = true,
    maxPixelRatio = 2,
    transmissionResolutionScale = 1,
  }: RendererOptions) {
    this.container = container;
    this.maxPixelRatio = maxPixelRatio;

    this.instance = new WebGLRenderer({
      antialias,
      powerPreference: 'high-performance',
      stencil: false,
    });

    const gl = this.instance;

    // Tone mapping — filmic curve keeps bloom highlights from clipping
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;

    gl.outputColorSpace = SRGBColorSpace;

    gl.transmissionResolutionScale = transmissionResolutionScale;

    // Shadows
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = PCFSoftShadowMap;

    // Background — PALETTE.background (#020617)
    gl.setClearColor(COLORS.background, 1);

    const canvas = gl.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);
    this.resize();
  }

  /** Returns current viewport metrics. */
  get viewport(): ViewportSize {
    const { width, height } = this.container.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio, this.maxPixelRatio);
    return { width, height, pixelRatio, aspect: width / height };
  }

  /**
   * Half-float type for postprocessing render targets.
   * Provides enough precision for bloom, DOF, and color grading without
   * the bandwidth cost of full 32-bit floats.
   */
  get halfFloatType(): typeof HalfFloatType {
    return HalfFloatType;
  }

  resize(): void {
    const { width, height, pixelRatio } = this.viewport;
    this.instance.setSize(width, height);
    this.instance.setPixelRatio(pixelRatio);
  }

  dispose(): void {
    this.instance.dispose();
    this.instance.domElement.remove();
  }
}
