import type { Camera, Object3D, Scene, Texture, WebGLRenderer } from 'three';
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
  /**
   * Flower-local XZ on the ground disc (from ground-plane raycast). Pass NaN to clear hit.
   * Optional `delta` + `pointerVelocity` (NDC space / sec, magnitude) tune ripple spawning.
   */
  setPointerWorld?(x: number, z: number, delta?: number, pointerVelocity?: number): void;
  /** Sync main camera for env shaders (e.g. particle camera shield). */
  syncEnvCamera?(camera: Camera): void;
  /** Pass the studio IBL texture to custom ShaderMaterial objects that need it. */
  setEnvMap?(texture: Texture | null, intensity?: number): void;
  /** Flower journey: glass pollen from scroll position (not speed). */
  setPollenScrollDrive?(gate01: number, journeyProgress01: number): void;
}

export type BloomSceneFactory = (ctx: BloomSceneFactoryContext) => BloomExperienceScene;
