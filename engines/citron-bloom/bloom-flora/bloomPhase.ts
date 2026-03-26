/**
 * Drives opening / closing of procedural flowers (0 = tight bud, 1 = full bloom).
 * Optional breathing pulse for living, cinematic motion.
 */
export class BloomPhaseController {
  /** Current visual bloom amount [0, 1]. */
  progress = 0;
  /** Subtle continuous oscillation mixed into shaders. */
  pulse = 0;
  private target = 0;
  private readonly smoothSpeed: number;
  private readonly pulseSpeed: number;
  private pulseT = 0;

  constructor(options?: { smoothSpeed?: number; pulseSpeed?: number }) {
    this.smoothSpeed = options?.smoothSpeed ?? 1.35;
    this.pulseSpeed = options?.pulseSpeed ?? 0.85;
  }

  /** Smoothly approach this value over time. */
  setTarget(t: number): void {
    this.target = Math.min(1, Math.max(0, t));
  }

  /** Instant jump (e.g. preset). */
  snapTo(t: number): void {
    this.target = this.progress = Math.min(1, Math.max(0, t));
  }

  update(delta: number): void {
    const k = 1 - Math.exp(-this.smoothSpeed * delta);
    this.progress += (this.target - this.progress) * k;
    this.pulseT += delta * this.pulseSpeed;
    this.pulse = Math.sin(this.pulseT) * 0.5 + 0.5;
  }
}
