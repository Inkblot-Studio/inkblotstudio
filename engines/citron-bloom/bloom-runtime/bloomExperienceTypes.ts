import type { Camera, Object3D, Scene, WebGLRenderer } from 'three';
import type { BloomLod } from '../bloom-core/types';

/** Camera behaviour for a registered bloom experience (extends app AnimationSystem). */
export type BloomCameraMode = 'delicate' | 'orbit' | 'showcaseOrbit';

export interface BloomSceneFactoryContext {
  renderer: WebGLRenderer;
  lod: BloomLod;
  /** Host scene (fog, environment hooks for particle demos). */
  scene: Scene;
}

/**
 * Pluggable 3D experience: swap `root` into the main scene exclusively.
 * Register factories on {@link BloomExperienceRegistry} to add unlimited scenes.
 */
export interface BloomExperienceScene {
  readonly id: string;
  readonly root: Object3D;
  readonly cameraMode: BloomCameraMode;
  update(delta: number, elapsed: number): void;
  dispose(): void;
  setBloomFromScroll?(scroll01: number): void;
  /** Direct bloom drive [0,1] — used by scroll journey (opening/closing curves applied by caller). */
  applyBloomDrive?(drive01: number): void;
  setPointerWorld?(x: number, z: number): void;
  /** Sync main camera for env shaders (e.g. particle camera shield). */
  syncEnvCamera?(camera: Camera): void;
}

export type BloomSceneFactory = (ctx: BloomSceneFactoryContext) => BloomExperienceScene;
