import {
  BufferGeometry,
  Camera,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import type { ShaderMaterial } from 'three';
import { createEnvParticleMaterial, type EnvParticleMaterialOptions } from '../particle-materials/createEnvParticleMaterial';
import type { EnvParticleSample } from './types';

const _dummy = new Object3D();
const _camWorld = new Vector3();
const _tangent = new Vector3();
const _up = new Vector3(0, 1, 0);
const _axis = new Vector3();
const _q = new Quaternion();

export interface InstancedParticleCloudOptions extends EnvParticleMaterialOptions {
  /** Base disc radius in geometry units; instance scale multiplies. */
  baseRadius?: number;
  /** Circle segments (keep low for perf). */
  segments?: number;
}

/**
 * Builds one InstancedMesh from sampled particles (curve-aligned discs, GPU motion).
 */
export function createInstancedParticleCloud(
  samples: readonly EnvParticleSample[],
  options: InstancedParticleCloudOptions = {},
): {
  readonly group: Group;
  readonly mesh: InstancedMesh;
  readonly material: ShaderMaterial;
  update: (delta: number, elapsed: number) => void;
  syncCamera: (camera: Camera) => void;
  dispose: () => void;
} {
  const count = samples.length;
  const group = new Group();
  group.name = 'particle-cloud';

  const baseRadius = options.baseRadius ?? 0.022;
  const segments = options.segments ?? 6;
  const geo = new CircleGeometry(baseRadius, segments) as BufferGeometry;
  geo.rotateX(Math.PI / 2);

  const material = createEnvParticleMaterial(options);
  material.side = DoubleSide;

  const mesh = new InstancedMesh(geo, material, count);
  mesh.frustumCulled = false;
  mesh.name = 'instanced-particle-cloud';

  const colors = new Float32Array(count * 4);
  const phases = new Float32Array(count);
  const along = new Float32Array(count);
  const random = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const s = samples[i]!;
    phases[i] = s.phase;
    along[i] = s.along;
    random[i] = s.random;
    colors[i * 4] = s.color.r;
    colors[i * 4 + 1] = s.color.g;
    colors[i * 4 + 2] = s.color.b;
    colors[i * 4 + 3] = 1;

    _tangent.copy(s.tangent);
    if (_tangent.lengthSq() < 1e-8) _tangent.set(0, 1, 0);
    else _tangent.normalize();

    _axis.crossVectors(_up, _tangent).normalize();
    if (_axis.lengthSq() < 1e-6) _axis.set(1, 0, 0);
    const angle = Math.acos(Math.max(-1, Math.min(1, _up.dot(_tangent))));
    _q.setFromAxisAngle(_axis, angle);

    _dummy.position.copy(s.position);
    _dummy.quaternion.copy(_q);
    _dummy.rotateZ((s.random - 0.5) * 1.1);
    _dummy.scale.setScalar(s.scale);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;

  geo.setAttribute('aInstanceColor', new InstancedBufferAttribute(colors, 4));
  geo.setAttribute('aPhase', new InstancedBufferAttribute(phases, 1));
  geo.setAttribute('aAlong', new InstancedBufferAttribute(along, 1));
  geo.setAttribute('aRandom', new InstancedBufferAttribute(random, 1));

  group.add(mesh);

  return {
    group,
    mesh,
    material,
    update(_delta: number, elapsed: number) {
      material.uniforms.uTime.value = elapsed;
    },
    syncCamera(camera: Camera) {
      camera.getWorldPosition(_camWorld);
      material.uniforms.uCameraWorld.value.copy(_camWorld);
    },
    dispose() {
      geo.dispose();
      material.dispose();
      mesh.removeFromParent();
    },
  };
}

/** Blend two colors with jitter for organic variation. */
export function lerpColorJitter(
  a: Color,
  b: Color,
  t: number,
  jitter: number,
  out: Color = new Color(),
): Color {
  out.lerpColors(a, b, Math.min(1, Math.max(0, t + (Math.random() - 0.5) * jitter)));
  return out;
}
