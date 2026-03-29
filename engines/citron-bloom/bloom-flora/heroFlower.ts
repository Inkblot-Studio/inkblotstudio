import {
  Color,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Quaternion,
  ShaderMaterial,
  type Texture,
  Vector3,
} from 'three';
import heroPetalVert from './shaders/heroPetal.vert';
import heroPetalFrag from './shaders/heroPetal.frag';
import { createPetalGeometry } from './petalGeometry';
import { HeroStem } from './heroStem';

export interface HeroFlowerOptions {
  petalCount?: number;
  motionIntensity?: number;
}

interface RingDef {
  count: number;
  /** 0 = inner (steep cone), 1 = outer (wide) — polar angle from +Y */
  openness: number;
}

/**
 * Layered turbine / phyllosphere: equal spacing within each ring, ring-to-ring twist so
 * outer petals sit in the gaps of inner tiers (sci-fi clean, minimal overlap).
 */
const RINGS: RingDef[] = [
  { count: 6, openness: 0.0 },
  { count: 10, openness: 0.24 },
  { count: 14, openness: 0.5 },
  { count: 18, openness: 0.76 },
  { count: 24, openness: 1.0 },
];

/** In radians from +Y: inner tight bud, outer low saucer — separated enough to interleave */
const THETA_MIN = 0.32;
const THETA_MAX = 1.08;

/** Stagger azimuth between rings so tiers don’t stack in the same vertical planes */
const RING_TWIST = 0.513; // ~29.4°, irrational vs 360° / small N

const TOTAL_PETALS = RINGS.reduce((s, r) => s + r.count, 0);

const RING_COLORS: [Color, Color][] = [
  [new Color('#7ee8b4'), new Color('#45cd85')],
  [new Color('#45cd85'), new Color('#2db17a')],
  [new Color('#2db17a'), new Color('#40b8d0')],
  [new Color('#40b8d0'), new Color('#60a5fa')],
  [new Color('#60a5fa'), new Color('#4589e6')],
];

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Cinematic hero flower: 72 curved petals in 5 concentric rings,
 * glass-like SSS shading, procedural veins, layered motion.
 */
export class HeroFlower extends Group {
  readonly petalMesh: InstancedMesh;
  readonly stem: HeroStem;
  private readonly petalMat: ShaderMaterial;

  constructor(opts: HeroFlowerOptions = {}) {
    super();
    this.matrixAutoUpdate = false;

    const geo = createPetalGeometry();

    this.petalMat = new ShaderMaterial({
      vertexShader: heroPetalVert,
      fragmentShader: heroPetalFrag,
      uniforms: {
        uTime: { value: 0 },
        uBloom: { value: 0 },
        uWind: { value: 1 },
        uPulse: { value: 0 },
        uEnvMap: { value: null },
        uEnvMapIntensity: { value: 0 },
      },
      transparent: true,
      depthWrite: true,
      side: DoubleSide,
    });

    this.petalMesh = new InstancedMesh(geo, this.petalMat, TOTAL_PETALS);
    this.petalMesh.matrixAutoUpdate = false;
    this.petalMesh.frustumCulled = false;

    this.buildLayout(geo);
    this.add(this.petalMesh);

    this.stem = new HeroStem();
    this.add(this.stem);

    this.updateMatrix();
  }

  private buildLayout(geo: ReturnType<typeof createPetalGeometry>): void {
    const ring01 = new Float32Array(TOTAL_PETALS);
    const variation = new Float32Array(TOTAL_PETALS * 4);
    const phase = new Float32Array(TOTAL_PETALS);
    const color = new Float32Array(TOTAL_PETALS * 3);

    const _pos = new Vector3();
    const _dir = new Vector3();
    const _bx = new Vector3();
    const _bz = new Vector3();
    const _quat = new Quaternion();
    const _scale = new Vector3(1, 1, 1);
    const _basis = new Matrix4();
    const _mat = new Matrix4();
    const _yAxis = new Vector3(0, 1, 0);
    const _tmp = new Color();

    let idx = 0;
    for (let ri = 0; ri < RINGS.length; ri++) {
      const ring = RINGS[ri];
      const ringT = ri / (RINGS.length - 1);
      const [c0, c1] = RING_COLORS[ri];

      const twist = ri * RING_TWIST;
      const o = ring.openness;
      const theta = THETA_MIN + o * (THETA_MAX - THETA_MIN);
      const st = Math.sin(theta);
      const ct = Math.cos(theta);

      for (let pi = 0; pi < ring.count; pi++) {
        const globalSeed = idx * 7.31 + 1.0;

        const phi = (2 * Math.PI * (pi + 0.5)) / ring.count + twist;
        const sp = Math.sin(phi);
        const cp = Math.cos(phi);

        _dir.set(st * cp, ct, st * sp).normalize();

        _bx.crossVectors(_yAxis, _dir);
        if (_bx.lengthSq() < 1e-10) _bx.set(1, 0, 0);
        else _bx.normalize();
        _bz.crossVectors(_bx, _dir);
        if (_bz.lengthSq() < 1e-10) _bz.set(0, 0, 1);
        else _bz.normalize();

        _basis.makeBasis(_bx, _dir, _bz);
        _quat.setFromRotationMatrix(_basis);

        const tierLift = 0.0024 + ri * 0.00095;
        const micro = 0.0011 * (1 - o);
        _pos.set(_dir.x * micro, tierLift, _dir.z * micro);
        _pos.x += (pseudoRandom(globalSeed + 0.1) - 0.5) * 0.0006;
        _pos.z += (pseudoRandom(globalSeed + 0.12) - 0.5) * 0.0006;

        _mat.compose(_pos, _quat, _scale);
        this.petalMesh.setMatrixAt(idx, _mat);

        ring01[idx] = ringT;

        variation[idx * 4] = (pseudoRandom(globalSeed + 0.2) - 0.5) * 1.15;
        variation[idx * 4 + 1] = pseudoRandom(globalSeed + 0.3);
        variation[idx * 4 + 2] = (pseudoRandom(globalSeed + 0.4) - 0.5) * 1.0;
        variation[idx * 4 + 3] = pseudoRandom(globalSeed + 0.5);

        phase[idx] = phi + ri * 0.85;

        const petalT = pi / ring.count;
        _tmp.lerpColors(c0, c1, petalT);
        color[idx * 3]     = _tmp.r;
        color[idx * 3 + 1] = _tmp.g;
        color[idx * 3 + 2] = _tmp.b;

        idx++;
      }
    }

    this.petalMesh.instanceMatrix.needsUpdate = true;

    geo.setAttribute('aRing01', new InstancedBufferAttribute(ring01, 1));
    geo.setAttribute('aVariation', new InstancedBufferAttribute(variation, 4));
    geo.setAttribute('aPhase', new InstancedBufferAttribute(phase, 1));
    geo.setAttribute('aColor', new InstancedBufferAttribute(color, 3));

    this.petalMesh.count = TOTAL_PETALS;
  }

  setBloom(progress: number, pulse: number): void {
    this.petalMat.uniforms.uBloom.value = progress;
    this.petalMat.uniforms.uPulse.value = pulse;
  }

  setWind(w: number): void {
    this.petalMat.uniforms.uWind.value = w;
    this.stem.tick(this.petalMat.uniforms.uTime.value, w);
  }

  setRippleShimmer(_phase: number, _strength: number): void {
    /* reserved for future per-petal ripple */
  }

  setEnvMap(texture: Texture | null, intensity = 1.5): void {
    this.petalMat.uniforms.uEnvMap.value = texture;
    this.petalMat.uniforms.uEnvMapIntensity.value = texture ? intensity : 0;
    this.stem.setEnvMap(texture, intensity);
  }

  update(elapsed: number): void {
    this.petalMat.uniforms.uTime.value = elapsed;
    this.stem.tick(elapsed, this.petalMat.uniforms.uWind.value);
  }

  dispose(): void {
    this.petalMesh.geometry.dispose();
    this.petalMat.dispose();
    this.stem.dispose();
    this.removeFromParent();
  }
}
