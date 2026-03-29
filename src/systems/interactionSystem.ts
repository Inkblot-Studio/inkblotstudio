import { Vector2, Raycaster } from 'three';
import { damp } from '@/utils/math';
import type { FrameContext, ISystem } from '@/types';

/**
 * Mouse / pointer interaction system.
 *
 * Tracks normalised pointer position [-1, 1] with damped smoothing,
 * and provides a raycaster for hover / click detection on scene objects.
 *
 * Planned integration points:
 *   • Parallax offset for camera / elements based on pointer position
 *   • Hover glow on flowers using PALETTE.accent (#10B981)
 *   • Click ripple effect on wet ground surface
 *   • Pointer-following particle attractor
 */
export class InteractionSystem implements ISystem {
  /** Damped pointer in normalised device coordinates [-1, 1]. */
  readonly pointer = new Vector2(0, 0);

  /** Raw NDC from the last pointer event — use for trails/cursors that should track the cursor tightly. */
  readonly rawPointer = new Vector2(0, 0);

  /** Velocity magnitude of the pointer. */
  public pointerVelocity = 0;

  /** NDC/sec from raw pointer motion (less smoothed than {@link pointerVelocity}) — better for VFX width. */
  public pointerVelocityRaw = 0;

  readonly raycaster = new Raycaster();
  private readonly dampFactor = 5;
  private readonly prevRawPointer = new Vector2(0, 0);
  private hasPrevRaw = false;

  init(_ctx: FrameContext): void {
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
  }

  update(ctx: FrameContext): void {
    const prevX = this.pointer.x;
    const prevY = this.pointer.y;

    this.pointer.x = damp(this.pointer.x, this.rawPointer.x, this.dampFactor, ctx.delta);
    this.pointer.y = damp(this.pointer.y, this.rawPointer.y, this.dampFactor, ctx.delta);

    // Calculate instantaneous velocity (smoothed pointer — slow for ribbon thickness)
    const dx = this.pointer.x - prevX;
    const dy = this.pointer.y - prevY;
    const vel = Math.sqrt(dx * dx + dy * dy) / Math.max(ctx.delta, 0.001);
    this.pointerVelocity = damp(this.pointerVelocity, vel, 2, ctx.delta);

    // Raw NDC delta per second — spikes on real cursor movement
    let rawVel = 0;
    if (this.hasPrevRaw) {
      const rdx = this.rawPointer.x - this.prevRawPointer.x;
      const rdy = this.rawPointer.y - this.prevRawPointer.y;
      rawVel = Math.sqrt(rdx * rdx + rdy * rdy) / Math.max(ctx.delta, 0.001);
    }
    this.prevRawPointer.copy(this.rawPointer);
    this.hasPrevRaw = true;
    this.pointerVelocityRaw = damp(this.pointerVelocityRaw, rawVel, 8, ctx.delta);

    this.raycaster.setFromCamera(this.pointer, ctx.camera);
  }

  dispose(): void {
    window.removeEventListener('pointermove', this.onPointerMove);
  }

  private onPointerMove = (e: PointerEvent): void => {
    this.rawPointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.rawPointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };
}
