import { clamp, damp } from '@/utils/math';
import type { FrameContext, ISystem } from '@/types';

/**
 * Scroll-driven progression system.
 *
 * Tracks the document's native scroll position and normalises it to [0, 1].
 * This avoids hijacking native scroll while keeping the cinematic 3D in sync.
 */
export class ScrollSystem implements ISystem {
  /** Normalised smoothed scroll position [0, 1]. */
  progress = 0;

  /** Un-smoothed target progress based on raw DOM scroll. */
  private targetProgress = 0;

  /** Velocity of scroll (units per second) — useful for motion blur or reactive particles. */
  velocity = 0;

  private readonly dampFactor = 5;

  init(_ctx: FrameContext): void {
    window.addEventListener('scroll', this.onScroll, { passive: true });
    // Trigger once to set initial state
    this.onScroll();
  }

  update(ctx: FrameContext): void {
    const prev = this.progress;
    this.progress = damp(this.progress, this.targetProgress, this.dampFactor, ctx.delta);
    
    // Prevent delta-0 division
    this.velocity = (this.progress - prev) / Math.max(ctx.delta, 0.001);
  }

  dispose(): void {
    window.removeEventListener('scroll', this.onScroll);
  }

  private onScroll = (): void => {
    // Calculate scroll progress based on standard DOM mechanics
    const docHeight = document.body.scrollHeight;
    const winHeight = window.innerHeight;
    const maxScroll = Math.max(docHeight - winHeight, 1);
    
    const scrollY = window.scrollY || window.pageYOffset;
    
    this.targetProgress = clamp(scrollY / maxScroll, 0, 1);
  };
}
