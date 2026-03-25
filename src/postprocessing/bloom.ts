import type { WebGLRenderer, Scene, Camera } from 'three';

/**
 * Bloom pass configuration — **stub for future implementation**.
 *
 * Will use Three.js UnrealBloomPass or a custom multi-pass Gaussian bloom.
 *
 * Planned parameters:
 *   • Threshold: tuned so only emissive surfaces and highlights bloom
 *   • Strength: moderate — enhances the wet-surface glow without washing out
 *   • Radius: wide kernel for a soft cinematic halo
 *
 * Palette-aware behaviour:
 *   • Primary (#2563EB) and primaryHover (#60A5FA) surfaces should bloom
 *   • Accent (#10B981) elements produce subtle green halos
 *   • Background (#020617) and surface (#0B1220) should NOT bloom
 */
export class BloomPass {
  private enabled = true;

  /** Default bloom parameters — will feed into UnrealBloomPass. */
  readonly config = {
    threshold: 0.6,
    strength: 1.2,
    radius: 0.8,
  };

  init(_renderer: WebGLRenderer): void {
    // TODO: Create EffectComposer render target (half-float)
    // TODO: Instantiate UnrealBloomPass with config
    // TODO: Add to postprocessing pipeline
  }

  update(_scene: Scene, _camera: Camera): void {
    // TODO: Render bloom pass
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  dispose(): void {
    // TODO: Dispose render targets and passes
  }
}
