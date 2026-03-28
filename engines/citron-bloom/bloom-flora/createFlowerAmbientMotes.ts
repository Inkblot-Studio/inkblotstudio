import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
  ShaderMaterial,
} from 'three';
import type { BloomLod } from '../bloom-core/types';
import {
  FLOWER_GROUND_DISC_LOCAL_Y,
  FLOWER_GROUND_DISC_RADIUS,
} from '../bloom-runtime/flowerStageConstants';

function scaleCount(lod: BloomLod, base: number): number {
  if (lod === 'medium') return Math.floor(base * 0.72);
  if (lod === 'low') return Math.floor(base * 0.5);
  return base;
}

export interface FlowerAmbientMotesHandle {
  readonly group: Group;
  update(elapsed: number, delta: number, bloomOpen: number): void;
  dispose(): void;
}

/**
 * Larger, softer additive specks above the mist disc — slow drift and bloom-linked brightness.
 */
export function createFlowerAmbientMotes(lod: BloomLod): FlowerAmbientMotesHandle {
  const group = new Group();
  group.name = 'flower-ambient-motes';

  const count = scaleCount(lod, 140);
  const geo = new BufferGeometry();
  const pos = new Float32Array(count * 3);
  const attrs = new Float32Array(count * 3);
  const rnd = (s: number) => {
    const x = Math.sin(s * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const inner = 0.35;
  const outer = FLOWER_GROUND_DISC_RADIUS * 0.92;
  const yLo = FLOWER_GROUND_DISC_LOCAL_Y + 0.08;
  const yHi = FLOWER_GROUND_DISC_LOCAL_Y + 1.35;
  for (let i = 0; i < count; i++) {
    const th = rnd(i * 2.91) * Math.PI * 2;
    const rr = inner + rnd(i * 4.77) * (outer - inner);
    pos[i * 3] = Math.cos(th) * rr;
    pos[i * 3 + 1] = yLo + rnd(i * 6.03) * (yHi - yLo);
    pos[i * 3 + 2] = Math.sin(th) * rr;
    attrs[i * 3] = rnd(i * 8.11) * Math.PI * 2;
    attrs[i * 3 + 1] = 0.65 + rnd(i * 9.29) * 0.55;
    attrs[i * 3 + 2] = 0.4 + rnd(i * 10.37) * 0.7;
  }
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new BufferAttribute(attrs, 3));

  const mat = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBloom: { value: 0 },
      uColorA: { value: new Color(0x5a9aaa) },
      uColorB: { value: new Color(0xc8eef5) },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uBloom;
      attribute vec3 aSeed;
      varying float vFade;
      varying vec3 vTint;

      void main() {
        float seed = aSeed.x;
        float br = aSeed.y;
        float slow = aSeed.z;
        vec3 p = position;
        float t = uTime * (0.11 + slow * 0.08);
        float swirl = seed + t * 0.35;
        p.x += sin(swirl) * 0.055 + sin(t * 0.42 + p.y * 1.8) * 0.022;
        p.z += cos(swirl * 0.92) * 0.055 + cos(t * 0.38 + p.x * 1.6) * 0.022;
        p.y += sin(t * 0.55 + seed * 3.0) * 0.035 + uTime * 0.012 * (0.5 + uBloom * 0.5);

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float bb = uBloom * uBloom;
        float sz = br * (2.4 + bb * 1.8) * (220.0 / max(-mv.z, 0.35));
        gl_PointSize = clamp(sz, 2.0, 14.0);
        gl_Position = projectionMatrix * mv;
        vFade = br * (0.55 + 0.45 * bb);
        float warm = 0.35 + 0.65 * bb;
        vTint = vec3(warm, 0.85 + 0.15 * bb, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uBloom;
      varying float vFade;
      varying vec3 vTint;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = length(c) * 2.0;
        if (r > 1.0) discard;
        float s = pow(max(0.0, 1.0 - r), 1.85);
        s = s * s * (3.0 - 2.0 * s);
        vec3 col = mix(uColorA, uColorB, s * 0.72);
        col *= vTint;
        float bb = uBloom * uBloom;
        float a = 0.028 * s * vFade * mix(0.75, 1.35, bb);
        gl_FragColor = vec4(col, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.name = 'flower-ambient-motes-points';
  group.add(points);

  return {
    group,
    update(elapsed: number, _delta: number, bloomOpen: number) {
      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uBloom.value = bloomOpen;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
