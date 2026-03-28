import {
  AdditiveBlending,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  ShaderMaterial,
  Vector2,
  Vector3,
  type PerspectiveCamera,
} from 'three';
import type { BloomLod } from '../bloom-core/types';

function poolSize(lod: BloomLod): number {
  if (lod === 'low') return 64;
  if (lod === 'medium') return 100;
  return 140;
}

/** Journey section (0–5) reshapes swirl “personality”; -1 = non-flower experiences. */
export type GlassShardJourneySection = number;

interface SwirlGlobals {
  freqA: number;
  freqRatioB: number;
  strength: number;
  lift: number;
  trailGlow: number;
  chroma: number;
}

/**
 * Global controller: each journey act gets a distinct swirl recipe + slow temporal drift
 * so shards read as one evolving system rather than noise.
 */
function swirlGlobalsForSection(section: GlassShardJourneySection, elapsed: number): SwirlGlobals {
  const s = section < 0 || section > 5 ? 0 : section;
  const presets: SwirlGlobals[] = [
    { freqA: 2.35, freqRatioB: 1.55, strength: 1.85, lift: 0.28, trailGlow: 1.0, chroma: 0.0 },
    { freqA: 3.6, freqRatioB: 2.05, strength: 2.65, lift: 0.42, trailGlow: 1.12, chroma: 0.15 },
    { freqA: 2.9, freqRatioB: 2.8, strength: 2.1, lift: 0.35, trailGlow: 1.08, chroma: 0.35 },
    { freqA: 4.4, freqRatioB: 1.35, strength: 3.0, lift: 0.52, trailGlow: 1.22, chroma: 0.55 },
    { freqA: 3.15, freqRatioB: 2.4, strength: 2.45, lift: 0.38, trailGlow: 1.15, chroma: 0.72 },
    { freqA: 2.65, freqRatioB: 3.1, strength: 2.25, lift: 0.48, trailGlow: 1.18, chroma: 0.9 },
  ];
  const base = presets[s] ?? presets[0]!;
  const wave = Math.sin(elapsed * 0.19 + s * 1.73) * 0.14 + 1.0;
  const wave2 = Math.cos(elapsed * 0.11 + s * 0.91) * 0.09 + 1.0;
  return {
    freqA: base.freqA * wave,
    freqRatioB: base.freqRatioB,
    strength: base.strength * wave2,
    lift: base.lift * (0.92 + 0.08 * wave),
    trailGlow: base.trailGlow,
    chroma: base.chroma,
  };
}

interface Shard {
  active: boolean;
  birth: number;
  life: number;
  seed: number;
  pos: Vector3;
  vel: Vector3;
  /** Orthonormal swirl plane vs initial motion */
  swirlB: Vector3;
  swirlN: Vector3;
  swirlPhase: number;
}

export interface PointerGlassShardsHandle {
  readonly group: Group;
  update(params: {
    elapsed: number;
    delta: number;
    camera: PerspectiveCamera;
    pointerNdc: Vector2;
    pointerVelocityNdc: number;
    enabled: boolean;
    /** `resolveJourney(...).section` in flower mode, else `-1`. */
    journeySection: GlassShardJourneySection;
  }): void;
  dispose(): void;
}

const _ray = new Raycaster();
const _origin = new Vector3();
const _dir = new Vector3();
const _tangent = new Vector3();
const _vel = new Vector3();
const _aux = new Vector3();
const _dummy = new Object3D();
const _quat = new Quaternion();
const _up = new Vector3(0, 1, 0);

/** NDC pointer travel required before a spawn is allowed (after cooldown). */
const MOVE_GATE = 0.022;
/** Minimum seconds between spawns — fewer, cleaner bursts. */
const MIN_SPAWN_INTERVAL = 0.17;
/** Optional second shard only when pointer is very fast (still rare). */
const VELOCITY_BONUS = 2.85;

/**
 * Additive glass streaks: move-gated spawns, long life + trail, journey-tuned swirls.
 */
export function createPointerGlassShards(lod: BloomLod): PointerGlassShardsHandle {
  const group = new Group();
  group.name = 'pointer-glass-shards';
  group.renderOrder = 12;

  const n = poolSize(lod);
  const shards: Shard[] = Array.from({ length: n }, () => ({
    active: false,
    birth: 0,
    life: 1.4,
    seed: 0,
    pos: new Vector3(),
    vel: new Vector3(),
    swirlB: new Vector3(),
    swirlN: new Vector3(),
    swirlPhase: 0,
  }));

  let write = 0;
  let lastSpawn = -1e6;
  const prevNdc = new Vector2(0, 0);
  let hasPrevNdc = false;
  let moveBank = 0;
  let prevJourneySec = -999;

  const geo = new PlaneGeometry(0.022, 0.44, 1, 12);
  const births = new Float32Array(n);
  const lives = new Float32Array(n);
  const seeds = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    births[i] = -1e6;
    lives[i] = 0.01;
    seeds[i] = Math.random() * 1000;
  }
  geo.setAttribute('aShardBirth', new InstancedBufferAttribute(births, 1));
  geo.setAttribute('aShardLife', new InstancedBufferAttribute(lives, 1));
  geo.setAttribute('aShardSeed', new InstancedBufferAttribute(seeds, 1));

  const birthAttr = geo.getAttribute('aShardBirth') as InstancedBufferAttribute;
  const lifeAttr = geo.getAttribute('aShardLife') as InstancedBufferAttribute;
  const seedAttr = geo.getAttribute('aShardSeed') as InstancedBufferAttribute;

  const mat = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uElapsed: { value: 0 },
      uTrailGlow: { value: 1 },
      uChroma: { value: 0 },
    },
    vertexShader: `
      attribute float aShardBirth;
      attribute float aShardLife;
      attribute float aShardSeed;
      varying vec2 vUv;
      varying float vAge;
      varying float vSeed;
      varying vec3 vViewN;
      uniform float uElapsed;

      void main() {
        vUv = uv;
        vSeed = aShardSeed;
        vec4 wPos = instanceMatrix * vec4(position, 1.0);
        vec4 mv = modelViewMatrix * wPos;
        vViewN = normalize(-mv.xyz);
        vAge = clamp((uElapsed - aShardBirth) / max(aShardLife, 0.001), 0.0, 1.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying float vAge;
      varying float vSeed;
      varying vec3 vViewN;
      uniform float uTime;
      uniform float uTrailGlow;
      uniform float uChroma;

      void main() {
        if (vAge <= 0.001 || vAge >= 0.999) discard;

        float tail = smoothstep(0.0, 0.1, vUv.y) * (1.0 - smoothstep(0.82, 1.0, vUv.y));
        float trailCore = pow(max(0.0, vUv.y), 0.65) * (1.0 - vUv.y) * 1.35;
        tail = max(tail, trailCore * 0.55);
        tail *= uTrailGlow;

        float edge = pow(max(0.0, 1.0 - abs(vUv.x - 0.5) * 2.05), 2.2);
        float lifeFade = smoothstep(0.0, 0.06, vAge) * (1.0 - smoothstep(0.68, 1.0, vAge));

        float ir = sin(dot(vViewN, vec3(2.1, 3.7, 5.3)) * 6.5 + uTime * 1.65 + vSeed * 0.02) * 0.5 + 0.5;
        vec3 c1 = mix(vec3(0.45, 0.88, 1.0), vec3(0.55, 0.95, 1.0), uChroma);
        vec3 c2 = mix(vec3(0.95, 0.72, 1.0), vec3(1.0, 0.82, 0.95), uChroma);
        vec3 c3 = mix(vec3(0.65, 1.0, 0.92), vec3(0.85, 1.0, 0.88), uChroma);
        vec3 col = mix(c1, c2, ir * 0.55);
        col = mix(col, c3, sin(vUv.y * 18.0 + uTime * 2.6 + vSeed) * 0.5 + 0.5);

        float shine = pow(max(0.0, dot(vViewN, vec3(0.0, 0.0, 1.0))), 3.2) * 0.9;
        col += vec3(1.0) * shine * (0.38 + 0.62 * (1.0 - vAge));

        float a = 0.48 * tail * edge * lifeFade * (0.52 + 0.48 * ir);
        gl_FragColor = vec4(col * 1.12, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    side: DoubleSide,
  });

  const mesh = new InstancedMesh(geo, mat, n);
  mesh.frustumCulled = false;
  mesh.count = n;
  group.add(mesh);

  function hide(i: number) {
    shards[i]!.active = false;
    births[i] = -1e6;
    lives[i] = 0.01;
    _dummy.position.set(0, -5000, 0);
    _dummy.scale.set(0, 0, 0);
    _dummy.rotation.set(0, 0, 0);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
  }

  function buildSwirlBasis(velocity: Vector3, seed: number, outB: Vector3, outN: Vector3) {
    const dir = _vel.copy(velocity);
    if (dir.lengthSq() < 1e-8) dir.set(0, 1, 0);
    else dir.normalize();
    _aux.set(Math.sin(seed * 1.97), Math.cos(seed * 2.31), Math.sin(seed * 0.73 + 1.2)).normalize();
    outB.crossVectors(dir, _aux);
    if (outB.lengthSq() < 1e-6) outB.set(1, 0, 0);
    outB.normalize();
    outN.crossVectors(dir, outB).normalize();
  }

  function spawn(
    elapsed: number,
    origin: Vector3,
    velocity: Vector3,
    life: number,
    seed: number,
  ) {
    const i = write;
    write = (write + 1) % n;
    const s = shards[i]!;
    s.active = true;
    s.birth = elapsed;
    s.life = life;
    s.seed = seed;
    s.pos.copy(origin);
    s.vel.copy(velocity);
    s.swirlPhase = Math.random() * Math.PI * 2;
    buildSwirlBasis(velocity, seed, s.swirlB, s.swirlN);
    births[i] = elapsed;
    lives[i] = life;
    seeds[i] = seed;
  }

  for (let i = 0; i < n; i++) hide(i);
  birthAttr.needsUpdate = true;
  lifeAttr.needsUpdate = true;

  return {
    group,
    update({ elapsed, delta, camera, pointerNdc, pointerVelocityNdc, enabled, journeySection }) {
      if (prevJourneySec === -999) {
        prevJourneySec = journeySection;
      } else if (journeySection !== prevJourneySec) {
        prevJourneySec = journeySection;
        moveBank += MOVE_GATE * 0.72;
      }

      const g = swirlGlobalsForSection(journeySection, elapsed);
      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uElapsed.value = elapsed;
      mat.uniforms.uTrailGlow.value = g.trailGlow;
      mat.uniforms.uChroma.value = g.chroma;

      let attrDirty = false;

      for (let i = 0; i < n; i++) {
        const s = shards[i]!;
        if (!s.active) continue;
        const age = elapsed - s.birth;
        if (age > s.life) {
          hide(i);
          attrDirty = true;
          continue;
        }

        const phA = s.swirlPhase + elapsed * g.freqA;
        const phB = phA * g.freqRatioB;
        s.vel.addScaledVector(s.swirlB, Math.sin(phA) * g.strength * delta);
        s.vel.addScaledVector(s.swirlN, Math.cos(phB) * g.strength * 0.58 * delta);
        s.vel.y += g.lift * delta;

        s.pos.addScaledVector(s.vel, delta);
        s.vel.multiplyScalar(1 - delta * 0.11);
        s.vel.y -= delta * 0.18;

        const t = age / s.life;
        const dir = _vel.copy(s.vel);
        if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
        else dir.normalize();

        _dummy.position.copy(s.pos);
        _quat.setFromUnitVectors(_up, dir);
        if (Math.abs(dir.dot(_up)) > 0.995) {
          _quat.setFromAxisAngle(new Vector3(1, 0, 0), Math.PI * 0.5);
        }
        _dummy.quaternion.copy(_quat);
        const len = 1.12 + (1 - t) * 0.62 + Math.sin(elapsed * 5 + s.seed) * 0.06;
        const w = 0.82 + Math.sin(elapsed * 6 + s.seed * 0.01) * 0.14;
        _dummy.scale.set(0.88 * w, len, 1);
        _dummy.updateMatrix();
        mesh.setMatrixAt(i, _dummy.matrix);
      }

      if (!enabled) {
        mesh.instanceMatrix.needsUpdate = true;
        return;
      }

      if (!hasPrevNdc) {
        prevNdc.copy(pointerNdc);
        hasPrevNdc = true;
      } else {
        const step = prevNdc.distanceTo(pointerNdc);
        prevNdc.copy(pointerNdc);
        moveBank += step;
      }

      const ready = elapsed - lastSpawn >= MIN_SPAWN_INTERVAL;
      const movedEnough = moveBank >= MOVE_GATE;

      if (ready && movedEnough) {
        moveBank = 0;
        lastSpawn = elapsed;

        _ray.setFromCamera(pointerNdc, camera);
        _origin.copy(_ray.ray.origin).addScaledVector(_ray.ray.direction, 2.5 + Math.random() * 2.6);
        _dir.copy(_ray.ray.direction);
        _tangent.crossVectors(camera.up, _dir).normalize();
        if (_tangent.lengthSq() < 0.01) _tangent.set(1, 0, 0);

        _vel
          .copy(_dir)
          .multiplyScalar(1.35 + Math.random() * 1.5)
          .addScaledVector(_tangent, (Math.random() - 0.5) * 1.9)
          .addScaledVector(camera.up, (Math.random() - 0.5) * 1.55);

        const life = 1.25 + Math.random() * 1.05;
        spawn(elapsed, _origin, _vel.clone(), life, Math.random() * 10000);
        attrDirty = true;

        if (pointerVelocityNdc >= VELOCITY_BONUS && lod !== 'low') {
          _vel
            .copy(_dir)
            .multiplyScalar(0.95 + Math.random() * 1.1)
            .addScaledVector(_tangent, (Math.random() - 0.5) * 2.4)
            .addScaledVector(camera.up, (Math.random() - 0.5) * 1.8);
          spawn(elapsed, _origin.clone(), _vel.clone(), life * 0.92, Math.random() * 10000);
          attrDirty = true;
        }
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (attrDirty) {
        birthAttr.needsUpdate = true;
        lifeAttr.needsUpdate = true;
        seedAttr.needsUpdate = true;
      }
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      group.removeFromParent();
    },
  };
}
