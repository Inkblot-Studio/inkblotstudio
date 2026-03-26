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
  if (lod === 'medium') return Math.floor(base * 0.7);
  if (lod === 'low') return Math.floor(base * 0.45);
  return base;
}

export interface FlowerFogMistHandle {
  readonly group: Group;
  update(elapsed: number): void;
  dispose(): void;
}

/**
 * Soft mist specks — very slow drift (reference: particle “floor” on studio homepages).
 */
export function createFlowerFogMistParticles(lod: BloomLod): FlowerFogMistHandle {
  const group = new Group();
  group.name = 'flower-fog-mist';

  const count = scaleCount(lod, 720);
  const geo = new BufferGeometry();
  const pos = new Float32Array(count * 3);
  const rnd = (s: number) => {
    const x = Math.sin(s * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const inner = 0.2;
  const outer = FLOWER_GROUND_DISC_RADIUS * 0.94;
  const y0 = FLOWER_GROUND_DISC_LOCAL_Y - 0.02;
  const y1 = FLOWER_GROUND_DISC_LOCAL_Y + 0.14;
  for (let i = 0; i < count; i++) {
    const th = rnd(i * 3.17) * Math.PI * 2;
    const rr = inner + rnd(i * 5.91) * (outer - inner);
    pos[i * 3] = Math.cos(th) * rr;
    pos[i * 3 + 1] = y0 + rnd(i * 7.23) * (y1 - y0);
    pos[i * 3 + 2] = Math.sin(th) * rr;
  }
  geo.setAttribute('position', new BufferAttribute(pos, 3));

  const mat = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color(0x3a6d78) },
      uColorCore: { value: new Color(0x8ec5ce) },
    },
    vertexShader: `
      uniform float uTime;
      void main() {
        vec3 p = position;
        float w = uTime * 0.22;
        p.x += sin(w + position.z * 2.1) * 0.018;
        p.z += cos(w * 0.85 + position.x * 1.7) * 0.018;
        p.y += sin(w * 0.55 + position.x * 3.0) * 0.008;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = 2.4 * (180.0 / max(-mv.z, 0.4));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uColorCore;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = length(c) * 2.0;
        if (r > 1.0) discard;
        float s = smoothstep(1.0, 0.25, r);
        vec3 col = mix(uColor, uColorCore, s * 0.55);
        gl_FragColor = vec4(col, 0.055 * s);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.name = 'flower-fog-mist-points';
  group.add(points);

  return {
    group,
    update(elapsed: number) {
      mat.uniforms.uTime.value = elapsed;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
