import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
  ShaderMaterial,
  Vector4,
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

function maxRipplesForLod(lod: BloomLod): number {
  if (lod === 'low') return 4;
  if (lod === 'medium') return 6;
  return 8;
}

interface Ripple {
  t0: number;
  x: number;
  z: number;
  amp: number;
}

export interface FlowerFogMistHandle {
  readonly group: Group;
  /** Call each frame before `update` with ground-local XZ (NaN = no hit). */
  queuePointer(
    x: number,
    z: number,
    delta: number,
    pointerVelocityNdc: number,
  ): void;
  update(elapsed: number, delta: number, bloomOpen: number): void;
  /** Aggregate for petal rim shimmer (no per-instance CPU work). */
  getPetalRippleShimmer(elapsed: number): { phase: number; strength: number };
  dispose(): void;
}

const RIPPLE_MAX_AGE = 3.85;
const MIN_SPAWN_INTERVAL = 0.088;
const MIN_MOVE_SPAWN = 0.046;
const VEL_BOOST_SPAWN = 2.15;

/**
 * Soft mist specks with pointer ripples (ring buffer, vertex displacement) — no solid ground.
 */
export function createFlowerFogMistParticles(lod: BloomLod): FlowerFogMistHandle {
  const group = new Group();
  group.name = 'flower-fog-mist';

  const maxRipples = maxRipplesForLod(lod);
  const ripples: Ripple[] = Array.from({ length: maxRipples }, () => ({
    t0: -1e6,
    x: 0,
    z: 0,
    amp: 0,
  }));
  let rippleWrite = 0;

  let prevPx = 0;
  let prevPz = 0;
  let pointerValid = false;
  let smoothedPull = 0;
  let lastSpawnTime = -1e6;

  let pending: {
    x: number;
    z: number;
    delta: number;
    vel: number;
    valid: boolean;
  } | null = null;

  const count = scaleCount(lod, 720);
  const geo = new BufferGeometry();
  const pos = new Float32Array(count * 3);
  const mist = new Float32Array(count * 2);
  const rnd = (s: number) => {
    const x = Math.sin(s * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const inner = 0.2;
  const outer = FLOWER_GROUND_DISC_RADIUS * 0.94;
  const y0 = FLOWER_GROUND_DISC_LOCAL_Y - 0.028;
  const y1 = FLOWER_GROUND_DISC_LOCAL_Y + 0.11;
  for (let i = 0; i < count; i++) {
    const th = rnd(i * 3.17) * Math.PI * 2;
    const rr = inner + rnd(i * 5.91) * (outer - inner);
    pos[i * 3] = Math.cos(th) * rr;
    pos[i * 3 + 1] = y0 + rnd(i * 7.23) * (y1 - y0);
    pos[i * 3 + 2] = Math.sin(th) * rr;
    mist[i * 2] = 0.58 + rnd(i * 11.13) * 0.62;
    mist[i * 2 + 1] = 0.5 + rnd(i * 13.41) * 0.55;
  }
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aMist', new BufferAttribute(mist, 2));

  const uR: Vector4[] = [];
  const rippleUniforms: Record<string, { value: Vector4 }> = {};
  for (let i = 0; i < 8; i++) {
    const v = new Vector4(0, 0, -1e6, 0);
    uR.push(v);
    rippleUniforms[`uR${i}`] = { value: v };
  }

  const mat = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBloomLift: { value: 0 },
      uPointer: { value: new Vector4(0, 0, 0, 0) },
      uColor: { value: new Color(0x3a6d78) },
      uColorCore: { value: new Color(0x8ec5ce) },
      ...rippleUniforms,
    },
    vertexShader: `
      uniform float uTime;
      uniform float uBloomLift;
      uniform vec4 uPointer;
      uniform vec4 uR0, uR1, uR2, uR3, uR4, uR5, uR6, uR7;
      attribute vec2 aMist;
      varying vec2 vMist;

      float waveR(vec3 p, vec4 r) {
        float w = r.w;
        if (w < 1e-5) return 0.0;
        float age = uTime - r.z;
        if (age < 0.0 || age > 3.85) return 0.0;
        float dist = length(p.xz - r.xy);
        float decay = exp(-age * 0.88);
        return sin(dist * 13.5 - age * 6.2) * decay * w * 0.024;
      }

      void main() {
        vMist = aMist;
        vec3 p = position;
        float w = uTime * 0.19;
        p.x += sin(w + position.z * 2.1) * 0.016;
        p.z += cos(w * 0.85 + position.x * 1.7) * 0.016;
        p.y += sin(w * 0.52 + position.x * 3.0) * 0.0065;

        float wr =
          waveR(p, uR0) + waveR(p, uR1) + waveR(p, uR2) + waveR(p, uR3) +
          waveR(p, uR4) + waveR(p, uR5) + waveR(p, uR6) + waveR(p, uR7);
        p.y += wr;
        p.x += wr * 0.32;
        p.z += wr * 0.26;

        if (uPointer.w > 0.002 && uPointer.z > 0.5) {
          vec2 to = uPointer.xy - p.xz;
          float d = length(to);
          float pull = uPointer.w * exp(-d * d * 0.1) * 0.015;
          p.xz += normalize(to + vec2(1e-5)) * pull;
        }

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float sz = 2.05 * aMist.x * (180.0 / max(-mv.z, 0.4));
        float lift = mix(1.0, 1.06, uBloomLift);
        gl_PointSize = clamp(sz * lift, 1.2, 6.8);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uColorCore;
      uniform float uBloomLift;
      varying vec2 vMist;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = length(c) * 2.0;
        if (r > 1.0) discard;
        float s = pow(max(0.0, 1.0 - r), 2.35);
        s = s * s * (3.0 - 2.0 * s);
        vec3 col = mix(uColor, uColorCore, s * 0.62);
        float lift = mix(0.94, 1.08, uBloomLift);
        col *= lift;
        float a = 0.042 * s * vMist.y * mix(0.9, 1.12, uBloomLift);
        gl_FragColor = vec4(col, a);
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

  function damp(a: number, b: number, lambda: number, dt: number): number {
    const t = 1 - Math.exp(-lambda * dt);
    return a + (b - a) * t;
  }

  function trySpawnRipple(elapsed: number, px: number, pz: number, move: number, vel: number): void {
    if (!pointerValid) return;
    const since = elapsed - lastSpawnTime;
    const wantVel = vel > VEL_BOOST_SPAWN && since > MIN_SPAWN_INTERVAL * 0.45;
    const wantMove = move > MIN_MOVE_SPAWN && since > MIN_SPAWN_INTERVAL;
    if (!wantVel && !wantMove) return;

    const amp = Math.min(0.55, 0.28 + move * 2.2 + Math.min(vel * 0.035, 0.32));
    ripples[rippleWrite] = { t0: elapsed, x: px, z: pz, amp };
    rippleWrite = (rippleWrite + 1) % maxRipples;
    lastSpawnTime = elapsed;
  }

  function syncRippleUniforms(elapsed: number): void {
    for (let i = 0; i < 8; i++) {
      const u = uR[i]!;
      if (i < maxRipples) {
        const r = ripples[i]!;
        const age = elapsed - r.t0;
        if (age < 0 || age > RIPPLE_MAX_AGE || r.amp < 1e-4) {
          u.set(0, 0, -1e6, 0);
        } else {
          u.set(r.x, r.z, r.t0, r.amp);
        }
      } else {
        u.set(0, 0, -1e6, 0);
      }
    }
  }

  return {
    group,
    queuePointer(x, z, delta, pointerVelocityNdc) {
      pending = {
        x,
        z,
        delta,
        vel: pointerVelocityNdc,
        valid: Number.isFinite(x) && Number.isFinite(z),
      };
    },
    update(elapsed: number, delta: number, bloomOpen: number) {
      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uBloomLift.value = bloomOpen;

      const q = pending;
      pending = null;

      if (q && q.valid) {
        const move = Math.hypot(q.x - prevPx, q.z - prevPz);
        smoothedPull = damp(smoothedPull, Math.min(move * 95 + q.vel * 0.12, 1), 7.5, Math.max(delta, 1e-4));
        trySpawnRipple(elapsed, q.x, q.z, move, q.vel);
        prevPx = q.x;
        prevPz = q.z;
        pointerValid = true;
        const up = mat.uniforms.uPointer.value as Vector4;
        up.set(q.x, q.z, 1, smoothedPull);
      } else if (q && !q.valid) {
        pointerValid = false;
        smoothedPull = damp(smoothedPull, 0, 5, Math.max(delta, 1e-4));
        const up = mat.uniforms.uPointer.value as Vector4;
        up.set(prevPx, prevPz, 0, smoothedPull);
      } else {
        smoothedPull = damp(smoothedPull, 0, 4, Math.max(delta, 1e-4));
        const up = mat.uniforms.uPointer.value as Vector4;
        up.set(prevPx, prevPz, pointerValid ? 1 : 0, smoothedPull);
      }

      syncRippleUniforms(elapsed);
    },
    getPetalRippleShimmer(elapsed: number) {
      let s = 0;
      for (let i = 0; i < maxRipples; i++) {
        const r = ripples[i]!;
        const age = elapsed - r.t0;
        if (age < 0 || age > RIPPLE_MAX_AGE) continue;
        s = Math.max(s, Math.exp(-age * 0.88) * r.amp);
      }
      return { phase: elapsed * 2.85, strength: s * 0.36 };
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
