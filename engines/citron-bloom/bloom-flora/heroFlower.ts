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
import { BloomTokens } from '../bloom-core/tokens';

export interface HeroFlowerOptions {
  petalCount?: number;
  motionIntensity?: number;
}

interface RingDef {
  count: number;
  radius: number;
  sizeScale: number;
  angleOffset: number;
}

const GOLDEN_ANGLE = 2.39996323;

const RINGS: RingDef[] = [
  { count: 6,  radius: 0.030, sizeScale: 0.42, angleOffset: 0 },
  { count: 10, radius: 0.085, sizeScale: 0.58, angleOffset: GOLDEN_ANGLE * 0.50 },
  { count: 14, radius: 0.150, sizeScale: 0.72, angleOffset: GOLDEN_ANGLE * 0.15 },
  { count: 18, radius: 0.225, sizeScale: 0.87, angleOffset: GOLDEN_ANGLE * 0.73 },
  { count: 24, radius: 0.380, sizeScale: 1.00, angleOffset: GOLDEN_ANGLE * 0.37 },
];

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
    const _quat = new Quaternion();
    const _scale = new Vector3(1, 1, 1);
    const _mat = new Matrix4();
    const _yAxis = new Vector3(0, 1, 0);
    const _tmp = new Color();

    let idx = 0;
    for (let ri = 0; ri < RINGS.length; ri++) {
      const ring = RINGS[ri];
      const ringT = ri / (RINGS.length - 1);
      const [c0, c1] = RING_COLORS[ri];

      for (let pi = 0; pi < ring.count; pi++) {
        const globalSeed = idx * 7.31 + 1.0;

        const angle = pi * GOLDEN_ANGLE + ring.angleOffset;
        const radiusJitter = 1.0 + (pseudoRandom(globalSeed + 0.1) - 0.5) * 0.12;
        const r = ring.radius * radiusJitter;

        _pos.set(Math.sin(angle) * r, 0, Math.cos(angle) * r);
        _quat.setFromAxisAngle(_yAxis, angle + Math.PI);
        _mat.compose(_pos, _quat, _scale);
        this.petalMesh.setMatrixAt(idx, _mat);

        ring01[idx] = ringT;

        variation[idx * 4]     = (pseudoRandom(globalSeed + 0.2) - 0.5) * 2.0;
        variation[idx * 4 + 1] = pseudoRandom(globalSeed + 0.3);
        variation[idx * 4 + 2] = (pseudoRandom(globalSeed + 0.4) - 0.5) * 2.0;
        variation[idx * 4 + 3] = pseudoRandom(globalSeed + 0.5);

        phase[idx] = pseudoRandom(globalSeed + 0.6) * Math.PI * 2;

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
