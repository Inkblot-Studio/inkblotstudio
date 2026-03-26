import {
  BufferGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three';
import type { CatmullRomCurve3 } from 'three';
import microLeafVert from './shaders/microLeaf.vert';
import microLeafFrag from './shaders/microLeaf.frag';
import { BloomTokens } from './tokens';

export interface MicroLeafOptions {
  count: number;
  curve: CatmullRomCurve3;
  wind?: number;
}

/**
 * Thousands of instanced micro-discs along a curve — GPU instancing, vertex wind/curl.
 */
export class InstancedMicroLeaves {
  readonly mesh: InstancedMesh;
  private readonly material: ShaderMaterial;
  private wind = 1;

  constructor(options: MicroLeafOptions) {
    const geo = new CircleGeometry(0.028, 5) as BufferGeometry;
    geo.rotateX(Math.PI / 2);

    this.material = new ShaderMaterial({
      vertexShader: microLeafVert,
      fragmentShader: microLeafFrag,
      uniforms: {
        uTime: { value: 0 },
        uWind: { value: options.wind ?? 1 },
        uRimColor: { value: BloomTokens.citron300.clone() },
        uCoreColor: { value: BloomTokens.citron700.clone() },
        uRimPower: { value: 2.4 },
      },
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    });

    this.mesh = new InstancedMesh(geo, this.material, options.count);
    this.mesh.frustumCulled = false;

    const colors = new Float32Array(options.count * 4);
    const phases = new Float32Array(options.count);
    const along = new Float32Array(options.count);
    const dummy = new Object3D();
    const tangent = new Vector3();
    const up = new Vector3(0, 1, 0);
    const axis = new Vector3();
    const q = new Quaternion();

    for (let i = 0; i < options.count; i++) {
      const t = i / Math.max(1, options.count - 1);
      along[i] = t;
      phases[i] = Math.random() * Math.PI * 2;

      const c = new Color().lerpColors(
        BloomTokens.citron500,
        BloomTokens.success,
        0.35 + Math.random() * 0.5,
      );
      colors[i * 4] = c.r;
      colors[i * 4 + 1] = c.g;
      colors[i * 4 + 2] = c.b;
      colors[i * 4 + 3] = 1;

      const u = t + (Math.random() - 0.5) * (0.5 / options.count);
      const p = options.curve.getPointAt(Math.min(1, Math.max(0, u)));
      options.curve.getTangentAt(Math.min(1, Math.max(0, u)), tangent);

      axis.crossVectors(up, tangent).normalize();
      if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
      const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(tangent))));
      q.setFromAxisAngle(axis, angle);

      dummy.position.copy(p);
      dummy.quaternion.copy(q);
      dummy.rotateZ((Math.random() - 0.5) * 0.8);
      const s = 0.55 + Math.random() * 0.9;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    geo.setAttribute('aInstanceColor', new InstancedBufferAttribute(colors, 4));
    geo.setAttribute('aPhase', new InstancedBufferAttribute(phases, 1));
    geo.setAttribute('aAlong', new InstancedBufferAttribute(along, 1));
  }

  setWind(w: number): void {
    this.wind = w;
    this.material.uniforms.uWind.value = w;
  }

  update(elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uWind.value = this.wind;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.mesh.removeFromParent();
  }
}
