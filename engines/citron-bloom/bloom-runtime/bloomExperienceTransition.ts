function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export interface BloomExperienceSwapDeps {
  setBlackout: (alpha01: number) => void;
  performSwap: (targetExperienceId: string) => void;
}

/**
 * Two-phase blackout around {@link BloomExperienceRegistry.activate} for in-runtime experience changes.
 */
export class BloomExperienceSwapController {
  private phase: 'idle' | 'fadeOut' | 'fadeIn' = 'idle';
  private t = 0;
  private targetId: string | null = null;
  private readonly fadeSeconds = 0.24;

  get isBusy(): boolean {
    return this.phase !== 'idle';
  }

  /** Returns false if a swap is already running. */
  startSwap(targetExperienceId: string): boolean {
    if (this.phase !== 'idle') return false;
    this.targetId = targetExperienceId;
    this.phase = 'fadeOut';
    this.t = 0;
    return true;
  }

  cancel(): void {
    this.phase = 'idle';
    this.t = 0;
    this.targetId = null;
  }

  update(delta: number, deps: BloomExperienceSwapDeps): void {
    if (this.phase === 'idle') return;

    if (this.phase === 'fadeOut') {
      this.t += delta / this.fadeSeconds;
      const k = smoothstep(0, 1, Math.min(1, this.t));
      deps.setBlackout(k);
      if (this.t >= 1 && this.targetId) {
        deps.performSwap(this.targetId);
        this.phase = 'fadeIn';
        this.t = 0;
      }
      return;
    }

    if (this.phase === 'fadeIn') {
      this.t += delta / this.fadeSeconds;
      const k = 1 - smoothstep(0, 1, Math.min(1, this.t));
      deps.setBlackout(k);
      if (this.t >= 1) {
        deps.setBlackout(0);
        this.phase = 'idle';
        this.targetId = null;
      }
    }
  }
}
