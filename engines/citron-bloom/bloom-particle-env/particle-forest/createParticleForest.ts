import type { Camera } from 'three';
import { Color, Group, Vector3 } from 'three';
import type { BloomLod } from '../../bloom-core/types';
import { BloomTokens } from '../../bloom-core/tokens';
import { createInstancedParticleCloud } from '../particles-core/instancedParticleCloud';
import type { EnvParticleSample, ParticleEnvHandle } from '../particles-core/types';
import { createParticleGroundRing } from '../particle-ground/createParticleGroundRing';
import { buildParticleTreeSamples } from '../particle-trees/buildTreeSamples';

export interface ParticleForestConfig {
  lod?: BloomLod;
  /** Number of trees. */
  treeCount?: number;
  /** Per-tree particle budget (scaled by LOD). */
  particleBudgetPerTree?: number;
  /** Outer extent for tree bases (XZ annulus / disk). */
  radius?: number;
  /** Keep this radius clear around origin (trees only outside). */
  innerRadius?: number;
  /** Min distance between tree bases (approximate). */
  minSeparation?: number;
  seed?: number;
  /** Mossy floor ring between innerRadius and radius (default true). */
  enableGround?: boolean;
  /** Extra world units past `radius` for ground outer edge. */
  groundPad?: number;
  /** Particle ground instances before LOD (default ~2400). */
  groundParticleBudget?: number;
  /** Camera proximity fade for particles (world units). */
  camNearFadeStart?: number;
  camNearFadeEnd?: number;
  /** Ground annulus inner radius (stem hole). If omitted, uses a small hole so the center isn’t empty. */
  groundInnerRadius?: number;
  /** Dark bark / deep foliage — reads as trees, not extra “flowers”. */
  mutedForest?: boolean;
}

function hash01(seed: number, i: number): number {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Many particle trees on XZ via stratified noise; single merged InstancedMesh.
 */
export function createParticleForest(config: ParticleForestConfig = {}): ParticleEnvHandle {
  const treeCount = config.treeCount ?? 9;
  const radius = config.radius ?? 6.2;
  const innerR = Math.max(0, config.innerRadius ?? 0);
  const minSep = config.minSeparation ?? 1.35;
  const seed = config.seed ?? 42;
  const perTreeBudget = config.particleBudgetPerTree ?? 1400;
  const annulus = Math.max(0.2, radius - innerR - 0.2);
  const enableGround = config.enableGround !== false;

  const positions: Vector3[] = [];
  let attempts = 0;
  const maxAttempts = treeCount * 120;

  while (positions.length < treeCount && attempts < maxAttempts) {
    attempts++;
    const i = positions.length;
    const a = hash01(seed, i * 3 + attempts) * Math.PI * 2;
    const t = 0.12 + hash01(seed, i * 7 + attempts) * 0.88;
    const r = innerR + 0.15 + t * annulus;
    const p = new Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    let ok = true;
    for (const q of positions) {
      if (p.distanceTo(q) < minSep) {
        ok = false;
        break;
      }
    }
    if (ok) positions.push(p);
  }

  const barkA = new Color(0x2a2218);
  const barkB = new Color(0x3d3428);
  const needleA = new Color(0x1a2e24);
  const needleB = new Color(0x283d30);

  const chunks: EnvParticleSample[][] = [];
  for (let t = 0; t < positions.length; t++) {
    const hue = hash01(seed, t * 11);
    const scale = 0.72 + hash01(seed, t * 19) * 0.55;
    const yaw = hash01(seed, t * 5) * Math.PI * 2;
    const trunk = config.mutedForest
      ? barkA.clone().lerp(barkB, hue * 0.55)
      : BloomTokens.citron600.clone().lerp(BloomTokens.citron500, hue * 0.4);
    const leaf = config.mutedForest
      ? needleA.clone().lerp(needleB, hue * 0.5)
      : BloomTokens.success.clone().lerp(BloomTokens.citron300, hue * 0.25);
    const branch = config.mutedForest
      ? barkB.clone().lerp(needleA, 0.4 + hue * 0.25)
      : BloomTokens.citron500.clone().lerp(trunk, 0.35);

    chunks.push(
      buildParticleTreeSamples({
        lod: config.lod,
        particleBudget: perTreeBudget,
        height: 1.15 + hash01(seed, t * 17) * 0.55,
        sway: 0.1 + hash01(seed, t * 13) * 0.08,
        offset: positions[t],
        scale,
        yaw,
        trunkColor: trunk,
        branchColor: branch,
        leafColor: leaf,
      }),
    );
  }

  const total = chunks.reduce((a, c) => a + c.length, 0);
  const all: EnvParticleSample[] = new Array(total);
  let o = 0;
  for (const c of chunks) {
    for (let i = 0; i < c.length; i++) all[o++] = c[i]!;
  }

  const coreC = config.mutedForest ? new Color(0x152018) : BloomTokens.citron700;
  const rimC = config.mutedForest ? new Color(0x2d4a38) : BloomTokens.citron300;

  const cloud = createInstancedParticleCloud(all, {
    baseRadius: 0.018,
    segments: 6,
    wind: config.mutedForest ? 0.88 : 1.05,
    cohesion: config.mutedForest ? 0.68 : 0.62,
    fadeNear: 38,
    fadeFar: 95,
    alpha: config.mutedForest ? 0.8 : 0.86,
    coreColor: coreC,
    rimColor: rimC,
    camNearFadeStart: config.camNearFadeStart ?? 0.24,
    camNearFadeEnd: config.camNearFadeEnd ?? 0.95,
  });

  const groundPad = config.groundPad ?? 1.15;
  const groundInner =
    config.groundInnerRadius ??
    (innerR > 0 ? Math.max(0.12, innerR * 0.08) : 0.12);
  const groundOuter = radius + groundPad;
  const ground = enableGround
    ? createParticleGroundRing({
        lod: config.lod,
        innerRadius: groundInner,
        outerRadius: groundOuter,
        seed: seed + 913,
        particleBudget: config.groundParticleBudget ?? 2400,
        baseColor: new Color(0x0b0f0d),
        accentColor: new Color(0x1a2820),
        camNearFadeStart: config.camNearFadeStart,
        camNearFadeEnd: config.camNearFadeEnd,
      })
    : null;

  const group = new Group();
  group.name = 'particle-forest';
  if (ground) group.add(ground.group);
  group.add(cloud.group);

  let ptrX = 0;
  let ptrY = 0;
  let ptrTargetBoost = 0;
  let ptrSmoothBoost = 0;

  return {
    group,
    update(delta: number, elapsed: number) {
      ptrSmoothBoost += (ptrTargetBoost - ptrSmoothBoost) * Math.min(1, delta * 5.5);
      cloud.material.uniforms.uPointer.value.set(ptrX, ptrY);
      cloud.material.uniforms.uPointerBoost.value = ptrSmoothBoost;
      ground?.update(delta, elapsed);
      cloud.update(delta, elapsed);
    },
    setPointerNdc(x: number, y: number) {
      ptrX = x;
      ptrY = y;
      ptrTargetBoost = Math.min(1, Math.hypot(x, y) * 1.05);
      ground?.setPointerNdc(x, y);
    },
    syncEnvCamera(camera: Camera) {
      ground?.syncCamera(camera);
      cloud.syncCamera(camera);
    },
    dispose() {
      ground?.dispose();
      cloud.dispose();
      group.removeFromParent();
    },
  };
}
