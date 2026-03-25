import type { FrameContext, ISystem } from '@/types';
import type { InkblotCamera } from '@/core/camera';

/**
 * Procedural animation system — executes a strict, storyboarded 3-stage
 * cinematic camera journey.
 */
export class AnimationSystem implements ISystem {
  private camera: InkblotCamera | null = null;
  private scrollProgress = 0;

  constructor(camera?: InkblotCamera) {
    this.camera = camera ?? null;
  }

  init(_ctx: FrameContext): void {}

  setScrollProgress(progress: number): void {
    this.scrollProgress = progress;
  }

  update(ctx: FrameContext): void {
    if (!this.camera) return;

    // The scroll progress [0, 1] maps to our narrative timeline
    const t = this.scrollProgress;

    // We define three keyframes for the camera:
    // 1. START (t=0): Macro close-up on the closed bud. Deep shadows.
    // 2. MID (t=0.5): Elegant pull back and arc around to reveal full bloom.
    // 3. END (t=1): Push directly into the blinding core.

    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;
    
    let lookX = 0;
    let lookY = 0;
    let lookZ = 0;

    // Add some constant slow cinematic drift independent of scroll
    const driftX = Math.sin(ctx.elapsed * 0.2) * 0.2;
    const driftY = Math.cos(ctx.elapsed * 0.15) * 0.2;

    if (t < 0.5) {
      // Transition from START (t=0) to MID (t=0.5)
      // Normalize t to [0, 1] for this segment
      const nt = t / 0.5;
      const ease = this.easeInOutSine(nt);

      // Start: Pulled back, wide shot of the closed bud
      const startPos = { x: 0, y: 3.0, z: 12.0 };
      // Mid: Orbiting around as it blooms
      const midPos = { x: -6, y: 4, z: 8 };

      targetX = this.lerp(startPos.x, midPos.x, ease);
      targetY = this.lerp(startPos.y, midPos.y, ease);
      targetZ = this.lerp(startPos.z, midPos.z, ease);

      // Look at the center of the flower
      lookX = 0;
      lookY = 1;
      lookZ = 0;
    } else {
      // Transition from MID (t=0.5) to END (t=1)
      const nt = (t - 0.5) / 0.5;
      const ease = this.easeInOutSine(nt);

      const midPos = { x: -6, y: 4, z: 8 };
      // End: Diving into the core
      const endPos = { x: 0, y: 1.0, z: 2.0 };

      targetX = this.lerp(midPos.x, endPos.x, ease);
      targetY = this.lerp(midPos.y, endPos.y, ease);
      targetZ = this.lerp(midPos.z, endPos.z, ease);

      // Still looking at the core
      lookX = 0;
      lookY = 0;
      lookZ = 0;
    }

    this.camera.moveTo(targetX + driftX, targetY + driftY, targetZ);
    this.camera.lookAtTarget(lookX, lookY, lookZ);
  }

  setCamera(camera: InkblotCamera): void {
    this.camera = camera;
  }

  dispose(): void {
    this.camera = null;
  }

  // --- Utility easing ---
  private lerp(start: number, end: number, amt: number): number {
    return (1 - amt) * start + amt * end;
  }

  private easeInOutSine(x: number): number {
    return -(Math.cos(Math.PI * x) - 1) / 2;
  }
}
