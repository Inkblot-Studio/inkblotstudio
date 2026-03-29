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

/**
 * Optical-clarity stack for the hero flower: no DOF, minimal bloom/glow/grain.
 * Other experiences should keep {@link citronBloomComposerOptionsForLod}.
 */
export function citronBloomComposerOptionsForFlowerExperience(lod: BloomLod): CitronBloomComposerOptions {
  const profile = BLOOM_LOD_PROFILES[lod];
  return {
    enableDof: false,
    bloomStrength: profile.bloomStrength * 0.055,
    bloomRadius: 0.18,
    bloomThreshold: 0.94,
    glowStrength: 0,
    filmIntensity: 0.002,
    gradeContrast: 1.04,
    gradeSaturation: 1.07,
    gradeWarmth: 0,
    gradeVignette: 0.3,
  };
}
