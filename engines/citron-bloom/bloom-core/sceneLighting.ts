import { PointLight } from 'three';

export type LightingPreset = 'hero' | 'gallery' | 'lab' | 'transition';

export interface CinematicLighting {
  readonly key: PointLight;
  readonly fill: PointLight;
  readonly rim: PointLight;
  update(elapsed: number): void;
  dispose(): void;
}

interface PresetDef {
  key: { color: number; intensity: number; distance: number; decay: number; pos: [number, number, number] };
  fill: { color: number; intensity: number; distance: number; decay: number; pos: [number, number, number] };
  rim: { color: number; intensity: number; distance: number; decay: number; pos: [number, number, number] };
  breatheAmp: number;
}

const DEFS: Record<LightingPreset, PresetDef> = {
  hero: {
    key:  { color: 0xffffff, intensity: 56,   distance: 30, decay: 2,   pos: [3.6, 1.2, 6.4] },
    fill: { color: 0x93c5fd, intensity: 38,   distance: 24, decay: 2,   pos: [-4, 0.2, 5.8] },
    rim:  { color: 0x60a5fa, intensity: 32,   distance: 22, decay: 1.5, pos: [0.5, -0.5, -5.8] },
    breatheAmp: 0.08,
  },
  gallery: {
    key:  { color: 0xfcfeff, intensity: 48,   distance: 28, decay: 1.8, pos: [3.2, 2.4, 5.5] },
    fill: { color: 0xa5c4f5, intensity: 28,   distance: 22, decay: 2,   pos: [-3.8, 0.8, 4.5] },
    rim:  { color: 0x60a5fa, intensity: 22,   distance: 20, decay: 1.6, pos: [0, -0.6, -5.2] },
    breatheAmp: 0.06,
  },
  lab: {
    key:  { color: 0x5599cc, intensity: 1.8,  distance: 18, decay: 1.8, pos: [-1.35, 2.8, -1.2] },
    fill: { color: 0x88c4aa, intensity: 1.05, distance: 14, decay: 2,   pos: [1.6, 1.5, -2.4] },
    rim:  { color: 0x22d3ee, intensity: 0.65, distance: 12, decay: 1.4, pos: [0, -0.2, 1.5] },
    breatheAmp: 0.1,
  },
  transition: {
    key:  { color: 0x9966ff, intensity: 1.45, distance: 28, decay: 1.8, pos: [2.8, 3.2, 4.2] },
    fill: { color: 0x22d3ee, intensity: 1.1,  distance: 22, decay: 1.6, pos: [-3.5, 1.2, 2.4] },
    rim:  { color: 0xff66cc, intensity: 0.6,  distance: 16, decay: 1.4, pos: [0, -0.8, -2.2] },
    breatheAmp: 0.12,
  },
};

function makeLight(d: PresetDef['key']): PointLight {
  const l = new PointLight(d.color, d.intensity, d.distance, d.decay);
  l.position.set(...d.pos);
  return l;
}

export function createCinematicLighting(preset: LightingPreset): CinematicLighting {
  const def = DEFS[preset];
  const key = makeLight(def.key);
  const fill = makeLight(def.fill);
  const rim = makeLight(def.rim);
  const baseKey = key.intensity;
  const baseFill = fill.intensity;
  const baseRim = rim.intensity;
  const amp = def.breatheAmp;

  return {
    key,
    fill,
    rim,
    update(elapsed: number) {
      key.intensity = baseKey + Math.sin(elapsed * 1.05) * baseKey * amp;
      fill.intensity = baseFill + Math.sin(elapsed * 0.88 + 1.2) * baseFill * amp;
      rim.intensity = baseRim + Math.sin(elapsed * 1.4 + 2.4) * baseRim * amp;
    },
    dispose() {
      key.dispose();
      fill.dispose();
      rim.dispose();
    },
  };
}
