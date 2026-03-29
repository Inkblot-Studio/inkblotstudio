import {
  Color,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type Camera,
  type Texture,
} from 'three';
import glassPollenFrag from './shaders/glassPollen.frag';
import glassPollenVert from './shaders/glassPollen.vert';
import { HERO_RING_COLOR_PAIRS, HERO_RING_COUNT } from './heroFlowerPalette';
import { createPollenFlowState, drivePollenFlow } from './pollenFlowDrive';
import type { BloomLod } from '../bloom-core/types';

function scaleCount(lod: BloomLod, base: number): number {
  if (lod === 'medium') return Math.floor(base * 0.68);
  if (lod === 'low') return Math.floor(base * 0.45);
  return base;
}

export interface FlowerGlassPollenUpdateOpts {
  bloom01: number;
  /** Act-local [0,1] while in flower section (host maps global scroll → section local). */
  journeyProgress01: number;
  gate01: number;
}

export interface FlowerGlassPollenHandle {
  readonly group: Group;
  update(elapsed: number, delta: number, opts: FlowerGlassPollenUpdateOpts): void;
  syncCamera(camera: Camera): void;
  setEnvMap(texture: Texture | null, intensity?: number): void;
  dispose(): void;
}

const _p = new Vector3();
const _q = new Quaternion();
const _s = new Vector3(1, 1, 1);
const _m = new Matrix4();
const _camLocal = new Vector3();
const _tmpColor = new Color();

function pollenRingIndex(layerIdx: number, rnd01: number): number {
  const base = layerIdx * 2;
  const bump = rnd01 < 0.5 ? 0 : 1;
  return Math.min(base + bump, HERO_RING_COUNT - 1);
}

/**
 * Pollen spawns at the flower crown then bursts up and wide; strength from scroll position (flow drive).
 */
export function createFlowerGlassPollen(lod: BloomLod): FlowerGlassPollenHandle {
  const group = new Group();
  group.name = 'flower-glass-pollen';
  group.position.set(0, 0.02, 0);

  const count = scaleCount(lod, 480);
  const geo = new SphereGeometry(1, 10, 8);

  const seeds = new Float32Array(count * 4);
  const layer = new Float32Array(count);
  const color = new Float32Array(count * 3);
  const rnd = (i: number, k: number) => {
    const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  const crownY = 0.1;
  const rInner = 0.132;
  const rOuter = 0.31;
  const mesh = new InstancedMesh(
    geo,
    new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBloom: { value: 0 },
        uEnvMap: { value: null },
        uEnvMapIntensity: { value: 0 },
        uDrift: { value: 0 },
        uBurst: { value: 0 },
        uAmbient: { value: 0 },
        uCameraLocal: { value: new Vector3(0, 0, 8) },
        uOpacity: { value: 0 },
        uRevealMotion: { value: 0 },
      },
      vertexShader: glassPollenVert,
      fragmentShader: glassPollenFrag,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: DoubleSide,
    }),
    count,
  );
  mesh.frustumCulled = false;
  mesh.name = 'glass-pollen-instances';

  for (let i = 0; i < count; i++) {
    const u = rnd(i, 0);
    const th = rnd(i, 1) * Math.PI * 2;
    let rr: number;
    let y: number;
    let layerIdx: number;

    if (u < 0.22) {
      layerIdx = 0;
      rr = rInner + rnd(i, 3) * (rOuter - rInner) * 0.72;
      y = crownY - 0.02 + rnd(i, 15) * 0.11;
      _p.set(Math.cos(th) * rr, y, Math.sin(th) * rr);
    } else if (u < 0.55) {
      layerIdx = 1;
      rr = rInner + 0.04 + rnd(i, 3) * (rOuter - rInner + 0.06);
      y = crownY + rnd(i, 16) * 0.12;
      _p.set(Math.cos(th) * rr, y, Math.sin(th) * rr);
    } else if (u < 0.9) {
      layerIdx = 1;
      rr = rOuter * 0.78 + rnd(i, 3) * 0.2;
      y = crownY + 0.04 + rnd(i, 17) * 0.14;
      _p.set(Math.cos(th) * rr, y, Math.sin(th) * rr);
    } else {
      layerIdx = 2;
      rr = rInner + 0.06 + rnd(i, 3) * (rOuter - rInner) * 0.45;
      y = crownY - 0.06 + rnd(i, 18) * 0.08;
      _p.set(Math.cos(th) * rr, y, Math.sin(th) * rr);
    }

    layer[i] = layerIdx;
    const ri = pollenRingIndex(layerIdx, rnd(i, 19));
    const [c0, c1] = HERO_RING_COLOR_PAIRS[ri];
    _tmpColor.lerpColors(c0, c1, rnd(i, 20));
    color[i * 3] = _tmpColor.r;
    color[i * 3 + 1] = _tmpColor.g;
    color[i * 3 + 2] = _tmpColor.b;

    const sc = (0.0015 + rnd(i, 4) * 0.0028) * (1.02 + layerIdx * 0.05);
    _q.setFromAxisAngle(
      new Vector3(rnd(i, 5) + 0.01, rnd(i, 6) + 0.01, rnd(i, 7) + 0.01).normalize(),
      rnd(i, 8) * Math.PI * 2,
    );
    _s.setScalar(sc);
    _m.compose(_p, _q, _s);
    mesh.setMatrixAt(i, _m);
    seeds[i * 4] = rnd(i, 9);
    seeds[i * 4 + 1] = rnd(i, 10);
    seeds[i * 4 + 2] = rnd(i, 11);
    seeds[i * 4 + 3] = rnd(i, 12);
  }
  mesh.instanceMatrix.needsUpdate = true;

  geo.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 4));
  geo.setAttribute('aLayer', new InstancedBufferAttribute(layer, 1));
  geo.setAttribute('aColor', new InstancedBufferAttribute(color, 3));

  const mat = mesh.material as ShaderMaterial;
  mesh.renderOrder = 1010;
  mesh.count = count;
  group.add(mesh);

  const flowState = createPollenFlowState();
  let smoothBurst = 0;
  let smoothOpacity = 0;
  let smoothRevealMotion = 0;

  return {
    group,
    update(elapsed: number, delta: number, opts: FlowerGlassPollenUpdateOpts) {
      const { bloom01, journeyProgress01, gate01 } = opts;
      const flow = drivePollenFlow(flowState, delta, gate01, journeyProgress01, bloom01);

      const dt = Math.max(delta, 0.0001);
      const kBurst = 1 - Math.exp(-8 * dt);
      const kOp = 1 - Math.exp(-3.2 * dt);
      const kRm = 1 - Math.exp(-4.2 * dt);
      smoothBurst += (flow.burstTarget - smoothBurst) * kBurst;
      smoothOpacity += (flow.opacityTarget - smoothOpacity) * kOp;
      const revealTarget = Math.min(1, smoothBurst * 1.08 + flow.driftScale * 0.35);
      smoothRevealMotion += (revealTarget - smoothRevealMotion) * kRm;

      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uBloom.value = bloom01;
      mat.uniforms.uDrift.value = flow.driftScale;
      mat.uniforms.uBurst.value = smoothBurst;
      mat.uniforms.uAmbient.value = flow.ambientScale;
      mat.uniforms.uOpacity.value = smoothOpacity;
      mat.uniforms.uRevealMotion.value = smoothRevealMotion;
      group.visible = smoothOpacity > 0.004;
    },
    syncCamera(camera: Camera) {
      _camLocal.copy(camera.position);
      group.worldToLocal(_camLocal);
      mat.uniforms.uCameraLocal.value.copy(_camLocal);
    },
    setEnvMap(texture: Texture | null, intensity = 1.5): void {
      mat.uniforms.uEnvMap.value = texture;
      mat.uniforms.uEnvMapIntensity.value = texture ? intensity : 0;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      mesh.removeFromParent();
    },
  };
}
