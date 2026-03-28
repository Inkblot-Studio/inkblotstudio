import { Color, DoubleSide, MeshPhysicalMaterial } from 'three';

export type GlassPreset = 'hero-glass' | 'slab-glass' | 'crystal-shard' | 'lab-crystal';

const PRESETS: Record<GlassPreset, () => MeshPhysicalMaterial> = {
  'hero-glass': () =>
    new MeshPhysicalMaterial({
      color: new Color(0x1a3352),
      metalness: 0.04,
      roughness: 0.012,
      transmission: 0.96,
      thickness: 0.24,
      ior: 1.52,
      iridescence: 0.14,
      iridescenceIOR: 1.22,
      iridescenceThicknessRange: [140, 280],
      transparent: true,
      opacity: 1,
      side: DoubleSide,
      emissive: new Color(0x2563eb),
      emissiveIntensity: 0.11,
      clearcoat: 1,
      clearcoatRoughness: 0.018,
      envMapIntensity: 1.62,
      specularIntensity: 1,
      attenuationColor: new Color(0xc7e8ff),
      attenuationDistance: 0.85,
    }),

  'slab-glass': () =>
    new MeshPhysicalMaterial({
      color: new Color(0x121c34),
      metalness: 0.08,
      roughness: 0.05,
      transmission: 0.78,
      thickness: 0.55,
      ior: 1.48,
      iridescence: 0.45,
      iridescenceIOR: 1.2,
      iridescenceThicknessRange: [90, 400],
      transparent: true,
      opacity: 1,
      side: DoubleSide,
      emissive: new Color(0x312e81),
      emissiveIntensity: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.55,
      specularIntensity: 1,
      attenuationColor: new Color(0x8cb4e8),
      attenuationDistance: 1.1,
    }),

  'crystal-shard': () =>
    new MeshPhysicalMaterial({
      color: new Color().setHSL(0.74, 0.62, 0.48),
      metalness: 0.88,
      roughness: 0.14,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
      iridescence: 1,
      iridescenceIOR: 1.32,
      iridescenceThicknessRange: [100, 420],
      emissive: new Color().setHSL(0.78, 0.5, 0.25),
      emissiveIntensity: 0.22,
      envMapIntensity: 1.65,
      specularIntensity: 1,
    }),

  'lab-crystal': () =>
    new MeshPhysicalMaterial({
      color: new Color(0x0e3845),
      metalness: 0.06,
      roughness: 0.06,
      transmission: 0.85,
      thickness: 0.3,
      ior: 1.55,
      transparent: true,
      opacity: 1,
      side: DoubleSide,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      emissive: new Color(0x22a8cc),
      emissiveIntensity: 0.28,
      envMapIntensity: 1.6,
      specularIntensity: 1,
      attenuationColor: new Color(0x55d4ee),
      attenuationDistance: 0.65,
    }),
};

/**
 * Create a new `MeshPhysicalMaterial` from a named preset.
 * Each call returns a fresh instance — safe to customise per-mesh.
 */
export function createGlassMaterial(
  preset: GlassPreset,
  overrides?: Partial<ConstructorParameters<typeof MeshPhysicalMaterial>[0]>,
): MeshPhysicalMaterial {
  const mat = PRESETS[preset]();
  if (overrides) mat.setValues(overrides);
  return mat;
}
