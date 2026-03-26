import type { Camera } from 'three';
import { Group, Vector3 } from 'three';
import { catmullFromPoints, dnaHelixPoints } from '../../bloom-curves/curveUtils';
import type { BloomLod } from '../../bloom-core/types';
import { BloomTokens } from '../../bloom-core/tokens';
import { sampleCurveWithJitter } from '../particle-curves/sampleAlongCurve';
import { createInstancedParticleCloud } from '../particles-core/instancedParticleCloud';
import type { ParticleEnvHandle } from '../particles-core/types';
import { scaleParticleBudget } from '../particles-core/types';

export interface ParticleFlowConfig {
  lod?: BloomLod;
  particleBudget?: number;
  /** Helix turns (organic ribbon). */
  turns?: number;
  /** Helix radius. */
  radius?: number;
  /** Path height extent. */
  height?: number;
  /** Extra displacement strength in shader via wind uniform. */
  flowStrength?: number;
}

/**
 * Dense particles along a helix spine — flowing, ribbon-like volume.
 */
export function createParticleFlow(config: ParticleFlowConfig = {}): ParticleEnvHandle {
  const base = config.particleBudget ?? 5600;
  const count = scaleParticleBudget(config.lod, base);
  const turns = config.turns ?? 4.2;
  const radius = config.radius ?? 0.85;
  const height = config.height ?? 2.4;
  const flow = config.flowStrength ?? 1.35;

  const pts = dnaHelixPoints(turns, radius, height, 96, 0).map((p) =>
    p.add(new Vector3(0, 0.2, 0)),
  );
  const curve = catmullFromPoints(pts, false);

  const samples = sampleCurveWithJitter(curve, count, {
    jitterRadius: 0.085,
    scaleMin: 0.42,
    scaleMax: 1.25,
    colorA: BloomTokens.citron400,
    colorB: BloomTokens.success,
    colorJitter: 0.35,
    alongPow: 0.92,
  });

  const cloud = createInstancedParticleCloud(samples, {
    baseRadius: 0.019,
    segments: 6,
    wind: flow,
    cohesion: 0.85,
    fadeNear: 24,
    fadeFar: 70,
    alpha: 0.9,
    coreColor: BloomTokens.citron700,
    rimColor: BloomTokens.citron300,
    rimPower: 2.5,
    camNearFadeStart: 0.2,
    camNearFadeEnd: 0.95,
  });

  const group = new Group();
  group.name = 'particle-flow';
  group.add(cloud.group);

  return {
    group,
    update(delta: number, elapsed: number) {
      cloud.update(delta, elapsed);
    },
    syncEnvCamera(camera: Camera) {
      cloud.syncCamera(camera);
    },
    dispose() {
      cloud.dispose();
      group.removeFromParent();
    },
  };
}
