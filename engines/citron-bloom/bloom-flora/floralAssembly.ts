import { Group, type Texture } from 'three';
import type { BloomLodProfile } from '../bloom-core/types';
import { HeroFlower } from './heroFlower';
import type { BloomPhaseController } from './bloomPhase';

export interface FloralAssemblyOptions {
  profile: BloomLodProfile;
}

/**
 * Adapter between BloomGraphBuilder (phase controllers, wind) and the
 * cinematic HeroFlower rendering system.
 */
export class FloralAssembly extends Group {
  private readonly flower: HeroFlower;
  private readonly phases: BloomPhaseController[];
  private isDirty = true;

  constructor(
    _options: FloralAssemblyOptions,
    phases: BloomPhaseController[],
  ) {
    super();
    this.matrixAutoUpdate = false;
    this.phases = phases;

    this.flower = new HeroFlower();
    this.flower.updateMatrix();
    this.add(this.flower);
  }

  applyBloomFromPhases(): void {
    const phase = this.phases[0];
    if (phase) {
      this.flower.setBloom(phase.progress, phase.pulse);
    }
  }

  setDirty(): void {
    this.isDirty = true;
  }

  update(elapsed: number, wind: number): void {
    if (this.isDirty) {
      this.updateMatrix();
      this.isDirty = false;
    }
    this.flower.setWind(wind);
    this.flower.update(elapsed);
  }

  setRippleShimmer(phase: number, strength: number): void {
    this.flower.setRippleShimmer(phase, strength);
  }

  setEnvMap(texture: Texture | null, intensity?: number): void {
    this.flower.setEnvMap(texture, intensity);
  }

  dispose(): void {
    this.flower.dispose();
  }
}
