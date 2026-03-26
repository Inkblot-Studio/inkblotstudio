import type { FrameContext, ISystem } from '@/types';
import type { InkblotCamera } from '@/core/camera';

/**
 * Procedural animation system — executes a slow cinematic orbit 
 * around the SDF fluid flower, revealing 3D text sections based on scroll.
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

    // The scroll progress [0, 1] maps to our orbit angle.
    // We want to orbit from 0 to about PI * 1.5 to reveal all text panels smoothly.
    const t = this.scrollProgress;
    
    // Base orbit angle driven by scroll
    const targetAngle = t * Math.PI * 1.5;

    // Radius stays constant so we don't zoom in and break the SDF illusion
    const radius = 12.0;

    // Constant slow cinematic drift independent of scroll to keep it feeling alive
    const driftAngle = ctx.elapsed * 0.05;
    const finalAngle = targetAngle + driftAngle;

    const targetX = Math.sin(finalAngle) * radius;
    const targetZ = Math.cos(finalAngle) * radius;
    
    // Slight vertical drift
    const targetY = 2.0 + Math.sin(ctx.elapsed * 0.2) * 0.5;

    this.camera.moveTo(targetX, targetY, targetZ);
    
    // Always look at the center of the fluid flower
    this.camera.lookAtTarget(0, 0, 0);
  }

  setCamera(camera: InkblotCamera): void {
    this.camera = camera;
  }

  dispose(): void {
    this.camera = null;
  }
}
