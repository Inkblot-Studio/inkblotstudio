import type { Camera, Color, Group, Vector3 } from 'three';
import type { BloomLod } from '../../bloom-core/types';

/** Handle returned by all particle environment factories. */
export interface ParticleEnvHandle {
  readonly group: Group;
  update(delta: number, elapsed: number): void;
  dispose(): void;
  /** NDC-ish pointer (e.g. from `CitronBloomComponent`); optional wind / warp. */
  setPointerNdc?(x: number, y: number): void;
  /** Fade particles that get too close to the camera (screen-space “bump” shield). */
  syncEnvCamera?(camera: Camera): void;
}

/** One particle instance placed along a spine (CPU-built once). */
export interface EnvParticleSample {
  readonly position: Vector3;
  /** Unit tangent for orienting the billboard / disc. */
  readonly tangent: Vector3;
  readonly scale: number;
  readonly color: Color;
  readonly phase: number;
  /** 0–1 along structure (gradient / rim). */
  readonly along: number;
  readonly random: number;
}

/** Optional LOD passed into factories; caps instance counts. */
export function scaleParticleBudget(lod: BloomLod | undefined, base: number): number {
  if (!lod) return base;
  const m = lod === 'high' ? 1 : lod === 'medium' ? 0.58 : 0.32;
  return Math.max(48, Math.floor(base * m));
}
