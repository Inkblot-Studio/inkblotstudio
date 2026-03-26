/**
 * LOD and performance tuning for Citron Bloom (GPU-heavy features scale down).
 */
export type BloomLod = 'high' | 'medium' | 'low';

export interface BloomLodProfile {
  readonly particleTexSize: number;
  readonly spineTubularSegments: number;
  readonly spineRadialSegments: number;
  readonly microLeafInstances: number;
  readonly enableDof: boolean;
  readonly bloomStrength: number;
  /** Max instanced petals across all flower layers (cap for GPU). */
  readonly maxPetals: number;
}

export const BLOOM_LOD_PROFILES: Record<BloomLod, BloomLodProfile> = {
  high: {
    particleTexSize: 128,
    spineTubularSegments: 220,
    spineRadialSegments: 10,
    microLeafInstances: 6000,
    enableDof: true,
    bloomStrength: 1.35,
    maxPetals: 320,
  },
  medium: {
    particleTexSize: 96,
    spineTubularSegments: 160,
    spineRadialSegments: 8,
    microLeafInstances: 3500,
    enableDof: false,
    bloomStrength: 1.15,
    maxPetals: 200,
  },
  low: {
    particleTexSize: 64,
    spineTubularSegments: 100,
    spineRadialSegments: 6,
    microLeafInstances: 1500,
    enableDof: false,
    bloomStrength: 0.95,
    maxPetals: 120,
  },
}

export interface CitronBloomConfig {
  lod?: BloomLod;
  particleTexSize?: number;
}

/** One concentric ring of petals on a flower head. */
export interface FlowerLayerSpec {
  readonly petalCount: number;
  readonly radius: number;
  readonly yOffset: number;
  /** Base tilt from vertical (radians). */
  readonly tilt: number;
  readonly scale: number;
  /** Extra twist around Y for organic overlap. */
  readonly twist: number;
}

export interface ProceduralFlowerOptions {
  readonly layers: FlowerLayerSpec[];
  /** Inner reproductive cluster scale. */
  readonly coreScale?: number;
}
