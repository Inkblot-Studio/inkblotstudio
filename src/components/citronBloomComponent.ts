import type { FrameContext, IComponent } from '@/types';
import { clamp, smootherstep } from '@/utils/math';
import {
  createCitronBloomScene,
  type CitronBloomSceneHandle,
} from '@citron-bloom-engine/examples/createCitronBloomScene';
import type { BloomLod } from '@citron-bloom-engine/bloom-core/types';
import type { InteractionSystem } from '@/systems/interactionSystem';

export class CitronBloomComponent implements IComponent {
  private handle!: CitronBloomSceneHandle;
  private interaction: InteractionSystem | null = null;

  constructor(
    private readonly lod: BloomLod,
    interaction?: InteractionSystem,
  ) {
    this.interaction = interaction ?? null;
  }

  init(ctx: FrameContext): void {
    this.handle = createCitronBloomScene({ renderer: ctx.renderer, lod: this.lod });
    ctx.scene.add(this.handle.root);
    this.handle.root.position.set(0, -0.35, 0);
  }

  update(ctx: FrameContext): void {
    this.handle.update(ctx.delta, ctx.elapsed);
    if (this.interaction) {
      this.handle.setPointerWorld(this.interaction.pointer.x * 2.2, this.interaction.pointer.y * 1.4);
    }
  }

  setBloomTarget(main: number, branch?: number, bud?: number): void {
    this.handle.setBloomTarget(main, branch, bud);
  }

  /**
   * Map page scroll [0, 1] to bloom targets: eased curve + slight stagger between heads.
   */
  setBloomFromScroll(scroll01: number): void {
    const s = clamp(scroll01, 0, 1);
    const main = smootherstep(0.1, 0.92, s);
    const branch = smootherstep(0.18, 0.96, s);
    const bud = smootherstep(0.06, 0.88, s);
    this.handle.setBloomTarget(main, branch, bud);
  }

  dispose(): void {
    this.handle.dispose();
  }
}
