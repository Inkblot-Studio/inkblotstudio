import { bloomScrollDrive } from '@citron-bloom-engine/bloom-runtime/flowerBloomExperience';
import type { FrameContext, ISystem } from '@/types';
import type { InkblotCamera } from '@/core/camera';
import { clamp, easeInOutCubic, lerp, smoothstep } from '@/utils/math';
import { Vector3 } from 'three';

export type CameraMotionMode = 'orbit' | 'delicate' | 'showcaseOrbit';

/** ~0.5s ease between journey acts (studio sites like Active Theory). */
const JOURNEY_CAMERA_BLEND_SEC = 0.52;

function sampleFlowerJourneyPose(
  section: number,
  localT: number,
  ctx: FrameContext,
  pointerNdcX: number,
  pointerNdcY: number,
  outPos: Vector3,
  outLook: Vector3,
): void {
  const px = pointerNdcX * 0.22;
  const py = pointerNdcY * 0.14;

  if (section === 0) {
    const u = bloomScrollDrive(localT);
    const ease = smoothstep(0, 1, u);
    const theta = u * Math.PI * 2.5 + ctx.elapsed * 0.0014;
    const radiusXZ = lerp(10.15, 8.05, ease);
    const camY = lerp(3.02, 1.48, ease);
    const lookY = lerp(0.06, 0.9, ease);
    const breathe = Math.sin(ctx.elapsed * 0.028) * (0.006 * (1 - ease * 0.55));
    outPos.set(Math.sin(theta) * radiusXZ + px, camY + breathe + py, Math.cos(theta) * radiusXZ);
    outLook.set(0, lookY, 0);
    return;
  }

  if (section === 1) {
    const t = Math.pow(smoothstep(0, 1, localT), 0.52);
    const z = lerp(7.05, 4.45, t);
    const yLift = lerp(0, 0.12, t);
    const breathe = Math.sin(ctx.elapsed * 0.045) * 0.015;
    outPos.set(px * 1.15, 1.72 + yLift + breathe + py, z);
    outLook.set(0, 0.28, 0);
    return;
  }

  if (section === 2) {
    const ang = Math.pow(localT, 0.55) * Math.PI * 0.72 + ctx.elapsed * 0.034;
    const rad = 8.15;
    outPos.set(Math.sin(ang) * rad + px, 2.02 + py, Math.cos(ang) * rad);
    outLook.set(0, 1.02, 0);
    return;
  }

  if (section === 3) {
    const sub = Math.min(1, Math.max(0, Math.pow((localT - 0.02) / 0.88, 0.62)));
    const drift = Math.sin(ctx.elapsed * 0.036) * (0.18 + sub * 0.28);
    const camY = 3.15 + py - sub * 2.05 + Math.sin(ctx.elapsed * 0.042) * 0.08 * sub;
    const camZ = 9.4 - sub * 3.15 + localT * 0.55;
    const lookY = -0.42 + sub * 0.55 + localT * 0.12;
    const lookZ = sub * 0.45;
    outPos.set(drift + px, camY, camZ);
    outLook.set(0, lookY, lookZ);
    return;
  }

  if (section === 4) {
    const sweep = Math.pow(localT, 0.5);
    const drift = Math.sin(ctx.elapsed * 0.06) * (0.16 + sweep * 0.16);
    const z = lerp(6.1, 5.35, sweep);
    outPos.set(drift + px, 2.02 + py, z);
    outLook.set(0, 0.52 + sweep * 0.08, -1.02 - sweep * 0.12);
    return;
  }

  const u = bloomScrollDrive(localT);
  const ease = smoothstep(0, 1, u);
  const theta = u * Math.PI * 2.5 + ctx.elapsed * 0.0014;
  const radiusXZ = lerp(10.15, 8.05, ease);
  const camY = lerp(3.02, 1.48, ease);
  const lookY = lerp(0.06, 0.9, ease);
  const breathe = Math.sin(ctx.elapsed * 0.028) * (0.006 * (1 - ease * 0.55));
  outPos.set(Math.sin(theta) * radiusXZ + px, camY + breathe + py, Math.cos(theta) * radiusXZ);
  outLook.set(0, lookY, 0);
}

/**
 * Camera motion: heavy scroll orbit (fluid / SDF) vs Citron Bloom delicate mode
 * (scroll-synced dolly + orbit around the plant, matched to bloom unveiling).
 */
export class AnimationSystem implements ISystem {
  private camera: InkblotCamera | null = null;
  private scrollProgress = 0;
  private pointerNdcX = 0;
  private pointerNdcY = 0;
  private mode: CameraMotionMode;
  private journeyFlower: { section: number; localT: number } | null = null;
  private readonly tmpUp = new Vector3(0, 1, 0);

  private readonly _samplePos = new Vector3();
  private readonly _sampleLook = new Vector3();
  private readonly _blendFromPos = new Vector3();
  private readonly _blendFromLook = new Vector3();
  private readonly _blendToPos = new Vector3();
  private readonly _blendToLook = new Vector3();
  private _lastJourneySection: number | null = null;
  private _journeyBlendT = 1;

  constructor(
    camera: InkblotCamera,
    initialMode: CameraMotionMode = 'orbit',
  ) {
    this.camera = camera;
    this.mode = initialMode;
  }

  setMode(mode: CameraMotionMode): void {
    this.mode = mode;
  }

  getMode(): CameraMotionMode {
    return this.mode;
  }

  init(_ctx: FrameContext): void {}

  setScrollProgress(progress: number): void {
    this.scrollProgress = progress;
  }

  setPointerNdc(x: number, y: number): void {
    this.pointerNdcX = x;
    this.pointerNdcY = y;
  }

  setJourneyFlower(state: { section: number; localT: number } | null): void {
    this.journeyFlower = state;
  }

  update(ctx: FrameContext): void {
    if (!this.camera) return;

    if (this.mode === 'delicate' && this.journeyFlower) {
      const { section, localT } = this.journeyFlower;
      const cam = this.camera.instance;

      if (section === 5) {
        cam.up.set(0, -1, 0);
      } else {
        cam.up.copy(this.tmpUp.set(0, 1, 0));
      }

      if (this._lastJourneySection !== null && this._lastJourneySection !== section) {
        sampleFlowerJourneyPose(
          this._lastJourneySection,
          1,
          ctx,
          this.pointerNdcX,
          this.pointerNdcY,
          this._blendFromPos,
          this._blendFromLook,
        );
        this._journeyBlendT = 0;
      }
      this._lastJourneySection = section;

      sampleFlowerJourneyPose(
        section,
        localT,
        ctx,
        this.pointerNdcX,
        this.pointerNdcY,
        this._blendToPos,
        this._blendToLook,
      );

      if (this._journeyBlendT < 1) {
        this._journeyBlendT = Math.min(1, this._journeyBlendT + ctx.delta / JOURNEY_CAMERA_BLEND_SEC);
        const w = easeInOutCubic(this._journeyBlendT);
        this._samplePos.lerpVectors(this._blendFromPos, this._blendToPos, w);
        this._sampleLook.lerpVectors(this._blendFromLook, this._blendToLook, w);
      } else {
        this._samplePos.copy(this._blendToPos);
        this._sampleLook.copy(this._blendToLook);
      }

      this.camera.moveTo(this._samplePos.x, this._samplePos.y, this._samplePos.z);
      this.camera.lookAtTarget(this._sampleLook.x, this._sampleLook.y, this._sampleLook.z);
      return;
    }

    if (this.mode === 'delicate') {
      this._lastJourneySection = null;
      this._journeyBlendT = 1;
      this.camera.instance.up.set(0, 1, 0);
      const raw = clamp(this.scrollProgress, 0, 1);
      const u = bloomScrollDrive(raw);
      const ease = smoothstep(0, 1, u);

      const theta = u * Math.PI * 2.5 + ctx.elapsed * 0.0022;

      const radiusXZ = lerp(10.15, 8.05, ease);
      const camY = lerp(3.02, 1.48, ease);
      const lookY = lerp(0.06, 0.9, ease);

      const breathe = Math.sin(ctx.elapsed * 0.038) * (0.01 * (1 - ease * 0.55));
      const parallaxX = this.pointerNdcX * (0.18 + ease * 0.14);
      const parallaxY = this.pointerNdcY * (0.12 + ease * 0.1);

      this.camera.moveTo(
        Math.sin(theta) * radiusXZ + parallaxX,
        camY + breathe + parallaxY,
        Math.cos(theta) * radiusXZ,
      );
      this.camera.lookAtTarget(0, lookY, 0);
      return;
    }

    if (this.mode === 'showcaseOrbit') {
      const driftAngle = ctx.elapsed * 0.125;
      const radius = 7.35;
      const y = 2.15 + Math.sin(ctx.elapsed * 0.085) * 0.22;
      const ppx = this.pointerNdcX * 0.55;
      const ppy = this.pointerNdcY * 0.35;
      this.camera.moveTo(
        Math.sin(driftAngle) * radius + ppx,
        y + ppy,
        Math.cos(driftAngle) * radius,
      );
      this.camera.lookAtTarget(0, 1.05, 0);
      return;
    }

    const t = this.scrollProgress;
    const targetAngle = t * Math.PI * 1.5;
    const radius = 12.0;
    const driftAngle = ctx.elapsed * 0.05;
    const finalAngle = targetAngle + driftAngle;

    const targetX = Math.sin(finalAngle) * radius;
    const targetZ = Math.cos(finalAngle) * radius;
    const targetY = 2.0 + Math.sin(ctx.elapsed * 0.2) * 0.5;

    this.camera.moveTo(targetX, targetY, targetZ);
    this.camera.lookAtTarget(0, 0, 0);
  }

  setCamera(camera: InkblotCamera): void {
    this.camera = camera;
  }

  dispose(): void {
    this.camera = null;
  }
}
