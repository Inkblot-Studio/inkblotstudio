import type { FrameContext, IComponent } from '@/types';
import { clamp } from '@/utils/math';
import {
  bloomExperienceRegistry,
  registerDefaultBloomExperiences,
  type BloomCameraMode,
  type BloomExperienceScene,
} from '@citron-bloom-engine/bloom-runtime';
import type { BloomLod } from '@citron-bloom-engine/bloom-core/types';
import type { InteractionSystem } from '@/systems/interactionSystem';

export class CitronBloomComponent implements IComponent {
  private active: BloomExperienceScene | null = null;
  private interaction: InteractionSystem | null = null;
  private currentExperienceId: string;

  constructor(
    private readonly lod: BloomLod,
    initialExperienceId: string,
    interaction?: InteractionSystem,
  ) {
    this.currentExperienceId = initialExperienceId;
    this.interaction = interaction ?? null;
  }

  init(ctx: FrameContext): void {
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

  /** In-runtime swap (pairs with {@link BloomExperienceSwapController}). */
  activateExperience(experienceId: string, ctx: FrameContext): void {
    registerDefaultBloomExperiences();
    bloomExperienceRegistry.disposeActive();
    try {
      this.active = bloomExperienceRegistry.activate(experienceId, ctx.scene, ctx.renderer, this.lod);
      this.currentExperienceId = experienceId;
    } catch {
      this.active = bloomExperienceRegistry.activate('flower', ctx.scene, ctx.renderer, this.lod);
      this.currentExperienceId = 'flower';
    }
  }

  getExperienceId(): string {
    return this.currentExperienceId;
  }

  update(ctx: FrameContext): void {
    this.active?.update(ctx.delta, ctx.elapsed);
    if (this.interaction && this.active?.setPointerWorld) {
      this.active.setPointerWorld(this.interaction.pointer.x * 2.2, this.interaction.pointer.y * 1.4);
    }
  }

  /** Call after {@link InkblotCamera.update} so env particles use the frame’s camera pose. */
  syncEnvParticlesCamera(ctx: FrameContext): void {
    this.active?.syncEnvCamera?.(ctx.camera);
  }

  getCameraMode(): BloomCameraMode {
    return this.active?.cameraMode ?? 'delicate';
  }

  setBloomFromScroll(scroll01: number): void {
    const s = clamp(scroll01, 0, 1);
    this.active?.setBloomFromScroll?.(s);
  }

  /** Scroll journey: pass pre-computed bloom drive in [0, 1]. */
  applyBloomDrive(drive01: number): void {
    const d = clamp(drive01, 0, 1);
    this.active?.applyBloomDrive?.(d);
  }

  dispose(): void {
    bloomExperienceRegistry.disposeActive();
    this.active = null;
  }
}
