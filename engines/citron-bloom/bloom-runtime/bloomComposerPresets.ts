import { BLOOM_LOD_PROFILES, type BloomLod } from '../bloom-core/types';
import type { CitronBloomComposerOptions } from '../bloom-postprocess/citronBloomComposer';

/**
 * Default post stack tuning for a LOD tier (matches Inkblot’s cinematic balance).
 */
export function citronBloomComposerOptionsForLod(lod: BloomLod): CitronBloomComposerOptions {
  const profile = BLOOM_LOD_PROFILES[lod];
  return {
    bloomStrength: profile.bloomStrength * 0.48,
    bloomRadius: 0.36,
    bloomThreshold: 0.82,
    enableDof: profile.enableDof,
  };
}
