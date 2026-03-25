import { PerspectiveCamera, Vector3 } from 'three';
import { damp } from '@/utils/math';
import type { ViewportSize } from '@/types';

export interface CameraConfig {
  fov?: number;
  near?: number;
  far?: number;
  /** Starting position — elevated, slightly pulled back for a cinematic framing. */
  position?: [x: number, y: number, z: number];
  /** Point the camera looks at on init. */
  lookAt?: [x: number, y: number, z: number];
}

const DEFAULTS: Required<CameraConfig> = {
  fov: 45,
  near: 0.1,
  far: 200,
  position: [0, 3, 12],
  lookAt: [0, 0, 0],
};

/**
 * Cinematic camera with damped movement.
 *
 * Initialised at an elevated, pulled-back position looking slightly
 * downward — suitable for slow dolly / orbit / crane-style motions
 * driven by the AnimationSystem or ScrollSystem later.
 */
export class InkblotCamera {
  readonly instance: PerspectiveCamera;

  /** Target position for damped interpolation. */
  private readonly targetPosition = new Vector3();

  /** Target look-at for damped interpolation. */
  private readonly targetLookAt = new Vector3();

  /** Smoothing factor — higher = snappier, lower = more cinematic. */
  private dampFactor = 3;

  constructor(config: CameraConfig = {}) {
    const cfg = { ...DEFAULTS, ...config };

    this.instance = new PerspectiveCamera(cfg.fov, 1, cfg.near, cfg.far);
    this.instance.position.set(...cfg.position);

    this.targetPosition.set(...cfg.position);
    this.targetLookAt.set(...cfg.lookAt);

    this.instance.lookAt(this.targetLookAt);
  }

  /** Call on window resize. */
  resize(viewport: ViewportSize): void {
    this.instance.aspect = viewport.aspect;
    this.instance.updateProjectionMatrix();
  }

  /** Set the camera's desired destination — movement is smoothed per-frame. */
  moveTo(x: number, y: number, z: number): void {
    this.targetPosition.set(x, y, z);
  }

  /** Set the camera's desired look-at target — smoothed per-frame. */
  lookAtTarget(x: number, y: number, z: number): void {
    this.targetLookAt.set(x, y, z);
  }

  /** Per-frame damped update — call from the render loop. */
  update(delta: number): void {
    const cam = this.instance;
    cam.position.x = damp(cam.position.x, this.targetPosition.x, this.dampFactor, delta);
    cam.position.y = damp(cam.position.y, this.targetPosition.y, this.dampFactor, delta);
    cam.position.z = damp(cam.position.z, this.targetPosition.z, this.dampFactor, delta);

    cam.lookAt(this.targetLookAt);
  }

  dispose(): void {
    // PerspectiveCamera has no GPU resources to free.
  }
}
