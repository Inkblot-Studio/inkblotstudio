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

  /**
   * Smoothed vertical scroll speed in px/s (decays after wheel/trackpad stops).
   * Used for UI “wind bend” on fast scroll.
   */
  velocityPxPerSec = 0;

  /** +1 scrolling down, −1 up — last non-zero scroll step (for skew direction). */
  scrollDirection = 1;

  private readonly dampFactor = 5;

  private prevScrollY = 0;
  private prevScrollTs = 0;

  init(_ctx: FrameContext): void {
    window.addEventListener('scroll', this.onScroll, { passive: true });
    this.prevScrollY = window.scrollY || window.pageYOffset;
    this.prevScrollTs = performance.now();
    // Trigger once to set initial state
    this.onScroll();
  }

  update(ctx: FrameContext): void {
    const prev = this.progress;
    this.progress = damp(this.progress, this.targetProgress, this.dampFactor, ctx.delta);

    // Prevent delta-0 division
    this.velocity = (this.progress - prev) / Math.max(ctx.delta, 0.001);

    this.velocityPxPerSec = damp(this.velocityPxPerSec, 0, 6.2, ctx.delta);
  }

  /**
   * Smoothly scroll the document so journey progress approaches `p` [0, 1].
   * Native scroll events keep {@link targetProgress} in sync.
   */
  scrollToProgress(p: number, behavior: ScrollBehavior = 'smooth'): void {
    const docHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
    );
    const winHeight = window.innerHeight;
    const maxScroll = Math.max(docHeight - winHeight, 1);
    const y = clamp(p, 0, 1) * maxScroll;
    window.scrollTo({ top: y, behavior });
  }

  dispose(): void {
    window.removeEventListener('scroll', this.onScroll);
  }

  private onScroll = (): void => {
    const now = performance.now();
    const scrollY = window.scrollY || window.pageYOffset;
    const dy = scrollY - this.prevScrollY;
    if (dy !== 0) {
      this.scrollDirection = dy > 0 ? 1 : -1;
    }

    if (this.prevScrollTs > 0) {
      const dt = Math.max((now - this.prevScrollTs) / 1000, 0.008);
      const inst = Math.abs((scrollY - this.prevScrollY) / dt);
      this.velocityPxPerSec = Math.max(this.velocityPxPerSec, inst);
    }
    this.prevScrollY = scrollY;
    this.prevScrollTs = now;

    // Use the larger of documentElement vs body — an in-flow spacer must contribute; body alone can lie.
    const docHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
    );
    const winHeight = window.innerHeight;
    const maxScroll = Math.max(docHeight - winHeight, 1);

    this.targetProgress = clamp(scrollY / maxScroll, 0, 1);
  };
}
