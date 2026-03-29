import type { FrameContext, IComponent } from '@/types';
import { clamp } from '@/utils/math';
import {
  CitronBloomEngineHost,
  type BloomCameraMode,
} from '@citron-bloom-engine/bloom-runtime';
import type { BloomLod } from '@citron-bloom-engine/bloom-core/types';
import type { InteractionSystem } from '@/systems/interactionSystem';

/**
 * Inkblot adapter around {@link CitronBloomEngineHost} — keeps scroll, journey, and chrome in the app;
 * all experience lifecycle lives in the Citron Bloom engine.
 */
export class CitronBloomComponent implements IComponent {
  private readonly host: CitronBloomEngineHost;
  private interaction: InteractionSystem | null = null;

  constructor(
    lod: BloomLod,
    initialExperienceId: string,
    interaction?: InteractionSystem,
  ) {
    this.host = CitronBloomEngineHost.fromOptions({
      lod,
      initialExperienceId,
      enableGroundPointer: true,
    });
    this.interaction = interaction ?? null;
  }

  init(ctx: FrameContext): void {
    this.host.init(ctx);
  }

  /** In-runtime swap (pairs with {@link BloomExperienceSwapController}). */
  activateExperience(experienceId: string, ctx: FrameContext): void {
    this.host.activateExperience(experienceId, ctx);
  }

  getExperienceId(): string {
    return this.host.getExperienceId();
  }

  update(ctx: FrameContext): void {
    if (this.interaction) {
      this.host.updateWithInteraction(
        ctx,
        this.interaction.pointer,
        this.interaction.pointerVelocity,
      );
    } else {
      this.host.update(ctx);
    }
  }

  /** Call after {@link InkblotCamera.update} so env particles use the frame’s camera pose. */
  syncEnvParticlesCamera(ctx: FrameContext): void {
    this.host.syncEnvCamera(ctx.camera);
  }

  getCameraMode(): BloomCameraMode {
    return this.host.getCameraMode();
  }

  setBloomFromScroll(scroll01: number): void {
    this.host.setBloomFromScroll(clamp(scroll01, 0, 1));
  }

  setPollenScrollDrive(gate01: number, journeyProgress01: number): void {
    this.host.setPollenScrollDrive(gate01, journeyProgress01);
  }

  applyBloomDrive(drive01: number): void {
    this.host.applyBloomDrive(clamp(drive01, 0, 1));
  }

  dispose(): void {
    this.host.dispose();
  }
}
