import type { Camera, Scene, WebGLRenderer } from 'three';

/**
 * Per-frame context passed into the Citron Bloom engine host.
 * Same role as a game engine “frame state” object — renderer, scene, camera, timing.
 */
export interface BloomFrameContext {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: Camera;
  delta: number;
  elapsed: number;
}
