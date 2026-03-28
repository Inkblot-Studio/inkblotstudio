import type { BloomLod } from '../bloom-core/types';

/** Scales mesh transmission buffer resolution by LOD (physical glass cost). */
export function transmissionResolutionScaleForBloomLod(lod: BloomLod): number {
  switch (lod) {
    case 'high':
      return 1;
    case 'medium':
      return 0.5;
    case 'low':
      return 0.25;
    default:
      return 1;
  }
}
