import type { Camera } from 'three';
import { Vector2 } from 'three';
import { clamp } from '../bloom-core/math';
import type { BloomLod } from '../bloom-core/types';
import { bloomExperienceRegistry } from './bloomExperienceRegistry';
import type { BloomCameraMode, BloomExperienceScene } from './bloomExperienceTypes';
import type { BloomFrameContext } from './bloomFrameContext';
import { flowerGroundPointerLocal } from './flowerGroundPointer';
import { registerDefaultBloomExperiences } from './registerDefaultBloomExperiences';

export interface CitronBloomEngineHostOptions {
  lod: BloomLod;
  initialExperienceId: string;
  /**
   * When true, `updateWithInteraction` raycasts the ground plane and calls `setPointerWorld` on the
   * active experience when supported.
   */
  enableGroundPointer?: boolean;
}

/**
 * End-to-end runtime for Citron Bloom experiences: registry activation, per-frame tick, optional
 * ground-pointer projection, and scroll/bloom hooks. Intended to be driven by a host app or
 * {@link createCitronBloomShell}.
 */
export class CitronBloomEngineHost {
  private active: BloomExperienceScene | null = null;
  private currentExperienceId: string;
  private readonly pointerScratch = new Vector2();
  private readonly enableGroundPointer: boolean;

  constructor(
    private readonly lod: BloomLod,
    initialExperienceId: string,
    enableGroundPointer = true,
  ) {
    this.currentExperienceId = initialExperienceId;
    this.enableGroundPointer = enableGroundPointer;
  }

  static fromOptions(opts: CitronBloomEngineHostOptions): CitronBloomEngineHost {
    return new CitronBloomEngineHost(
      opts.lod,
      opts.initialExperienceId,
      opts.enableGroundPointer ?? true,
    );
  }

  init(ctx: BloomFrameContext): void {
    registerDefaultBloomExperiences();
    try {
      this.active = bloomExperienceRegistry.activate(
        this.currentExperienceId,
        ctx.scene,
        ctx.renderer,
        this.lod,
      );
    } catch {
      this.currentExperienceId = 'flower';
      this.active = bloomExperienceRegistry.activate('flower', ctx.scene, ctx.renderer, this.lod);
    }
  }

  activateExperience(experienceId: string, ctx: BloomFrameContext): void {
    registerDefaultBloomExperiences();
    bloomExperienceRegistry.disposeActive();
    try {
      this.active = bloomExperienceRegistry.activate(
        experienceId,
        ctx.scene,
        ctx.renderer,
        this.lod,
      );
      this.currentExperienceId = experienceId;
    } catch {
      this.active = bloomExperienceRegistry.activate('flower', ctx.scene, ctx.renderer, this.lod);
      this.currentExperienceId = 'flower';
    }
  }

  /** Experience simulation step only (no pointer). */
  update(ctx: BloomFrameContext): void {
    this.active?.update(ctx.delta, ctx.elapsed);
  }

  updateWithInteraction(
    ctx: BloomFrameContext,
    ndc: Vector2,
    pointerVelocity: number,
  ): void {
    if (
      this.enableGroundPointer &&
      this.active?.setPointerWorld &&
      this.active.root
    ) {
      const hit = flowerGroundPointerLocal(ctx.camera, ndc, this.active.root, this.pointerScratch);
      if (hit) {
        this.active.setPointerWorld(
          this.pointerScratch.x,
          this.pointerScratch.y,
          ctx.delta,
          pointerVelocity,
        );
      } else {
        this.active.setPointerWorld(NaN, NaN, ctx.delta, 0);
      }
    }
    this.active?.update(ctx.delta, ctx.elapsed);
  }

  syncEnvCamera(camera: Camera): void {
    this.active?.syncEnvCamera?.(camera);
  }

  getCameraMode(): BloomCameraMode {
    return this.active?.cameraMode ?? 'delicate';
  }

  setBloomFromScroll(scroll01: number): void {
    this.active?.setBloomFromScroll?.(clamp(scroll01, 0, 1));
  }

  applyBloomDrive(drive01: number): void {
    this.active?.applyBloomDrive?.(clamp(drive01, 0, 1));
  }

  getExperienceId(): string {
    return this.currentExperienceId;
  }

  getActiveScene(): BloomExperienceScene | null {
    return this.active;
  }

  dispose(): void {
    bloomExperienceRegistry.disposeActive();
    this.active = null;
  }
}
