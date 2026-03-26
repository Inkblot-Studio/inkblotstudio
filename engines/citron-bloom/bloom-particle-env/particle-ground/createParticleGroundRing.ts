import type { Camera, ShaderMaterial } from 'three';
import { Color, Group, Vector3 } from 'three';
import type { BloomLod } from '../../bloom-core/types';
import { createInstancedParticleCloud } from '../particles-core/instancedParticleCloud';
import type { EnvParticleSample } from '../particles-core/types';
import { scaleParticleBudget } from '../particles-core/types';

export interface ParticleGroundRingConfig {
  lod?: BloomLod;
  innerRadius: number;
  outerRadius: number;
  seed?: number;
  /** Instance count before LOD scale (default 2600). */
  particleBudget?: number;
  baseColor?: Color;
  accentColor?: Color;
  camNearFadeStart?: number;
  camNearFadeEnd?: number;
  /** Geometry disc radius (instance scale multiplies). */
  baseDiscRadius?: number;
  minScale?: number;
  maxScale?: number;
  alpha?: number;
  fadeNear?: number;
  fadeFar?: number;
  /** Shader sway; lower = stays flatter on the plane (default 0.42). */
  wind?: number;
  /** Lower = less vertical wobble (default 0.78). */
  cohesion?: number;
  /** Multiplier for pointer-driven motion (default 1.05). */
  pointerBoostScale?: number;
}

function hash01(seed: number, i: number): number {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const GROUND_UP = new Vector3(0, 1, 0);

/**
 * Living moss/soil carpet: instanced env particles on an XZ annulus, tangent up.
 */
export function createParticleGroundRing(config: ParticleGroundRingConfig): {
  readonly group: Group;
  readonly material: ShaderMaterial;
  update(delta: number, elapsed: number): void;
  setPointerNdc(x: number, y: number): void;
  syncCamera(camera: Camera): void;
  dispose(): void;
} {
  const inner = Math.max(0.02, config.innerRadius);
  const outer = Math.max(inner + 0.06, config.outerRadius);
  const seed = config.seed ?? 701;
  const ptrBoostScale = config.pointerBoostScale ?? 1.05;
  const baseBudget = config.particleBudget ?? 2600;
  const count = scaleParticleBudget(config.lod, baseBudget);

  const base = config.baseColor ?? new Color(0x0a0e0c);
  const accent = config.accentColor ?? new Color(0x1f3228);
  const rimHint = accent.clone().lerp(new Color(0x2d4a38), 0.35);

  const discR = config.baseDiscRadius ?? 0.012;
  const sMin = config.minScale ?? 0.038;
  const sMax = config.maxScale ?? 0.133;
  const alpha = config.alpha ?? 0.72;
  const fadeNear = config.fadeNear ?? 22;
  const fadeFar = config.fadeFar ?? 88;

  const inner2 = inner * inner;
  const outer2 = outer * outer;
  const span2 = outer2 - inner2;

  const samples: EnvParticleSample[] = [];
  for (let i = 0; i < count; i++) {
    const u = hash01(seed, i * 3 + 1);
    const r = Math.sqrt(inner2 + u * span2);
    const th = hash01(seed, i * 5 + 2) * Math.PI * 2;
    const y = (hash01(seed, i * 7 + 3) - 0.5) * 0.036;
    const position = new Vector3(Math.cos(th) * r, y, Math.sin(th) * r);

    const tMix = hash01(seed, i * 11 + 4);
    const color = base.clone().lerp(accent, 0.2 + tMix * 0.75);
    if (hash01(seed, i * 13 + 5) > 0.72) {
      color.lerp(rimHint, 0.15 + hash01(seed, i * 17 + 6) * 0.25);
    }

    const scale = sMin + hash01(seed, i * 19 + 7) * (sMax - sMin);
    const along = (r - inner) / Math.max(1e-4, outer - inner);

    samples.push({
      position,
      tangent: GROUND_UP,
      scale,
      color,
      phase: hash01(seed, i * 23 + 8) * Math.PI * 2,
      along,
      random: hash01(seed, i * 29 + 9),
    });
  }

  const cloud = createInstancedParticleCloud(samples, {
    baseRadius: discR,
    segments: 5,
    wind: config.wind ?? 0.42,
    cohesion: config.cohesion ?? 0.78,
    fadeNear,
    fadeFar,
    alpha,
    coreColor: base.clone().multiplyScalar(0.92),
    rimColor: rimHint.clone(),
    rimPower: 2.0,
    camNearFadeStart: config.camNearFadeStart ?? 0.22,
    camNearFadeEnd: config.camNearFadeEnd ?? 1.02,
  });

  cloud.group.name = 'particle-ground-ring';

  let ptrX = 0;
  let ptrY = 0;
  let ptrTargetBoost = 0;
  let ptrSmoothBoost = 0;

  return {
    group: cloud.group,
    material: cloud.material,
    update(delta: number, elapsed: number) {
      ptrSmoothBoost += (ptrTargetBoost - ptrSmoothBoost) * Math.min(1, delta * 5.5);
      cloud.material.uniforms.uPointer.value.set(ptrX, ptrY);
      cloud.material.uniforms.uPointerBoost.value = ptrSmoothBoost;
      cloud.update(delta, elapsed);
    },
    setPointerNdc(x: number, y: number) {
      ptrX = x;
      ptrY = y;
      ptrTargetBoost = Math.min(1, Math.hypot(x, y) * ptrBoostScale);
    },
    syncCamera(camera: Camera) {
      cloud.syncCamera(camera);
    },
    dispose() {
      cloud.dispose();
    },
  };
}
