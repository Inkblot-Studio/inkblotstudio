import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { PerspectiveCamera } from 'three';

/**
 * Orbit controls wrapper — **disabled by default**.
 *
 * Interaction will be driven by the ScrollSystem and InteractionSystem;
 * OrbitControls is kept available for debug / development use only.
 */
export class InkblotControls {
  readonly instance: OrbitControls;

  constructor(camera: PerspectiveCamera, domElement: HTMLElement) {
    this.instance = new OrbitControls(camera, domElement);

    // Disabled by default — cinematic camera movement is procedural
    this.instance.enabled = false;

    this.instance.enableDamping = true;
    this.instance.dampingFactor = 0.05;
    this.instance.enableZoom = false;
    this.instance.enablePan = false;

    this.instance.minPolarAngle = Math.PI / 4;
    this.instance.maxPolarAngle = Math.PI / 2;
  }

  /** Enable controls (debug / development mode). */
  enable(): void {
    this.instance.enabled = true;
  }

  /** Disable controls (production cinematic mode). */
  disable(): void {
    this.instance.enabled = false;
  }

  update(): void {
    if (this.instance.enabled) {
      this.instance.update();
    }
  }

  dispose(): void {
    this.instance.dispose();
  }
}
