import type { Camera } from 'three';
import { Color, Group, Vector3 } from 'three';
import { catmullFromPoints } from '../../bloom-curves/curveUtils';
import type { BloomLod } from '../../bloom-core/types';
import { BloomTokens } from '../../bloom-core/tokens';
import { sampleCurveWithJitter, sampleVerticalColumn } from '../particle-curves/sampleAlongCurve';
import { createInstancedParticleCloud } from '../particles-core/instancedParticleCloud';
import type { EnvParticleSample, ParticleEnvHandle } from '../particles-core/types';
import { scaleParticleBudget } from '../particles-core/types';

export interface ParticleInteriorConfig {
  lod?: BloomLod;
  particleBudget?: number;
  /** Column count in a ring. */
  columns?: number;
  /** Column height. */
  height?: number;
  /** Ring radius. */
  radius?: number;
  pillarColor?: Color;
  archColor?: Color;
}

function merge(chunks: EnvParticleSample[][]): EnvParticleSample[] {
  const n = chunks.reduce((a, c) => a + c.length, 0);
  const out: EnvParticleSample[] = new Array(n);
  let o = 0;
  for (const c of chunks) {
    for (let i = 0; i < c.length; i++) out[o++] = c[i]!;
  }
  return out;
}

/**
 * Particle columns + arch curves (no solid mesh).
 */
export function createParticleInterior(config: ParticleInteriorConfig = {}): ParticleEnvHandle {
  const base = config.particleBudget ?? 5200;
  const budget = scaleParticleBudget(config.lod, base);
  const columns = config.columns ?? 8;
  const height = config.height ?? 3.2;
  const radius = config.radius ?? 2.8;
  const pillarColor = config.pillarColor ?? BloomTokens.citron600.clone();
  const archColor = config.archColor ?? BloomTokens.citron300.clone();

  const perCol = Math.floor((budget * 0.55) / columns);
  const colChunks: EnvParticleSample[][] = [];

  for (let i = 0; i < columns; i++) {
    const a = (i / columns) * Math.PI * 2;
    colChunks.push(
      sampleVerticalColumn(
        0,
        height,
        Math.max(48, perCol),
        0.06,
        a,
        radius * (0.92 + (i % 3) * 0.02),
        pillarColor.clone().multiplyScalar(0.85 + (i % 4) * 0.04),
      ),
    );
  }

  const archCount = 4;
  const perArch = Math.floor((budget * 0.45) / archCount);
  const archChunks: EnvParticleSample[][] = [];

  for (let k = 0; k < archCount; k++) {
    const rot = (k / archCount) * Math.PI * 2 + Math.PI / archCount;
    const pts: Vector3[] = [];
    const segs = 22;
    for (let s = 0; s <= segs; s++) {
      const u = s / segs;
      const ang = u * Math.PI;
      const x = Math.cos(rot) * (radius * 0.98 * Math.sin(ang));
      const z = Math.sin(rot) * (radius * 0.98 * Math.sin(ang));
      const y = height * 0.55 + (radius * 0.55) * (1 - Math.cos(ang)) * 0.5;
      pts.push(new Vector3(x, y, z));
    }
    const curve = catmullFromPoints(pts, false);
    archChunks.push(
      sampleCurveWithJitter(curve, Math.max(40, perArch), {
        jitterRadius: 0.05,
        scaleMin: 0.48,
        scaleMax: 1.05,
        colorA: archColor,
        colorB: BloomTokens.citron500,
        colorJitter: 0.15,
      }),
    );
  }

  const all = merge([...colChunks, ...archChunks]);

  const cloud = createInstancedParticleCloud(all, {
    baseRadius: 0.021,
    segments: 6,
    wind: 0.75,
    cohesion: 0.55,
    fadeNear: 26,
    fadeFar: 78,
    alpha: 0.88,
    coreColor: BloomTokens.citron700,
    rimColor: BloomTokens.citron300,
    camNearFadeStart: 0.22,
    camNearFadeEnd: 0.98,
  });

  const group = new Group();
  group.name = 'particle-interior';
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
