import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import petalVert from './shaders/petal.vert';
import petalFrag from './shaders/petal.frag';
import type { FlowerLayerSpec, ProceduralFlowerOptions } from '../bloom-core/types';
import { BloomTokens } from '../bloom-core/tokens';

function scaleLayers(layers: FlowerLayerSpec[], maxPetals: number): FlowerLayerSpec[] {
  const sum = layers.reduce((s, l) => s + l.petalCount, 0);
  if (sum <= maxPetals) return layers;
  const f = maxPetals / sum;
  return layers.map((l) => ({
    ...l,
    petalCount: Math.max(3, Math.floor(l.petalCount * f)),
  }));
}

/** Default multi-layer citron flower — good baseline for complex blooms. */
export function defaultFlowerLayers(): FlowerLayerSpec[] {
  return [
    { petalCount: 11, radius: 0.14, yOffset: -0.02, tilt: 0.55, scale: 0.78, twist: 0.12 },
    { petalCount: 14, radius: 0.26, yOffset: 0.06, tilt: 0.42, scale: 1.0, twist: -0.08 },
    { petalCount: 18, radius: 0.38, yOffset: 0.14, tilt: 0.32, scale: 1.12, twist: 0.2 },
    { petalCount: 22, radius: 0.48, yOffset: 0.22, tilt: 0.22, scale: 1.05, twist: -0.15 },
  ];
}

/**
 * Layered procedural flower: instanced petals with shader-driven bloom opening,
 * wind, and rim lighting. Includes a soft luminous core cluster.
 */
export class ProceduralFlower extends Group {
  readonly petalMesh: InstancedMesh;
  readonly coreMesh: InstancedMesh;
  private readonly petalMaterial: ShaderMaterial;
  private readonly coreMaterial: ShaderMaterial;
  private readonly dummy = new Object3D();

  constructor(options: ProceduralFlowerOptions & { maxPetals?: number }) {
    super();
    const layers = scaleLayers(options.layers, options.maxPetals ?? 320);
    const total = layers.reduce((s, l) => s + l.petalCount, 0);

    const geo = new PlaneGeometry(0.22, 0.56, 8, 18);
    geo.translate(0, 0.28, 0);

    this.petalMaterial = new ShaderMaterial({
      vertexShader: petalVert,
      fragmentShader: petalFrag,
      uniforms: {
        uTime: { value: 0 },
        uBloom: { value: 0 },
        uPulse: { value: 0 },
        uWind: { value: 1 },
        uRimColor: { value: BloomTokens.citron300.clone() },
        uDeepColor: { value: BloomTokens.citron700.clone() },
        uRimPower: { value: 2.0 },
      },
      transparent: true,
      depthWrite: true,
      side: DoubleSide,
    });

    this.petalMesh = new InstancedMesh(geo, this.petalMaterial, total);
    this.petalMesh.frustumCulled = false;

    const colors = new Float32Array(total * 4);
    const phases = new Float32Array(total);
    let idx = 0;

    for (const layer of layers) {
      for (let k = 0; k < layer.petalCount; k++) {
        const a = (k / layer.petalCount) * Math.PI * 2 + layer.twist;
        const c = new Color().lerpColors(
          BloomTokens.citron400,
          BloomTokens.success,
          0.2 + (k / layer.petalCount) * 0.55 + layer.yOffset * 0.35,
        );
        colors[idx * 4] = c.r;
        colors[idx * 4 + 1] = c.g;
        colors[idx * 4 + 2] = c.b;
        colors[idx * 4 + 3] = 1;
        phases[idx] = Math.random() * Math.PI * 2;

        const x = Math.cos(a) * layer.radius;
        const z = Math.sin(a) * layer.radius;
        this.dummy.position.set(x, layer.yOffset, z);
        this.dummy.rotation.order = 'YXZ';
        this.dummy.rotation.y = a + Math.PI / 2;
        this.dummy.rotation.x = layer.tilt;
        this.dummy.scale.setScalar(layer.scale * (0.92 + Math.random() * 0.16));
        this.dummy.updateMatrix();
        this.petalMesh.setMatrixAt(idx, this.dummy.matrix);
        idx++;
      }
    }

    this.petalMesh.instanceMatrix.needsUpdate = true;
    geo.setAttribute('aInstanceColor', new InstancedBufferAttribute(colors, 4));
    geo.setAttribute('aPhase', new InstancedBufferAttribute(phases, 1));

    const coreScale = options.coreScale ?? 1;
    const coreGeo = new SphereGeometry(0.022, 6, 5);
    this.coreMaterial = new ShaderMaterial({
      vertexShader: `
        attribute float aSeed;
        uniform float uTime;
        uniform float uBloom;
        varying float vGlow;
        void main() {
          vGlow = 0.6 + 0.4 * sin(uTime * 3.0 + aSeed * 6.28);
          vec3 p = position * (1.0 + 0.15 * uBloom);
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vGlow;
        void main() {
          gl_FragColor = vec4(uColor * (0.85 + 0.35 * vGlow), 0.55);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uBloom: { value: 0 },
        uColor: { value: BloomTokens.citron300.clone() },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    const coreCount = 22;
    this.coreMesh = new InstancedMesh(coreGeo, this.coreMaterial, coreCount);
    this.coreMesh.frustumCulled = false;
    const seeds = new Float32Array(coreCount);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < coreCount; i++) {
      const t = i / Math.max(1, coreCount - 1);
      const y = 1 - t * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      this.dummy.position.set(Math.cos(th) * r * 0.1 * coreScale, y * 0.08 * coreScale, Math.sin(th) * r * 0.1 * coreScale);
      this.dummy.scale.setScalar(0.75 + Math.random() * 0.55);
      this.dummy.rotation.set(Math.random(), Math.random(), Math.random());
      this.dummy.updateMatrix();
      this.coreMesh.setMatrixAt(i, this.dummy.matrix);
      seeds[i] = Math.random();
    }
    this.coreMesh.instanceMatrix.needsUpdate = true;
    coreGeo.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1));

    this.add(this.petalMesh, this.coreMesh);
  }

  setBloom(progress: number, pulse: number): void {
    this.petalMaterial.uniforms.uBloom.value = progress;
    this.petalMaterial.uniforms.uPulse.value = pulse;
    this.coreMaterial.uniforms.uBloom.value = progress;
  }

  setWind(w: number): void {
    this.petalMaterial.uniforms.uWind.value = w;
  }

  update(elapsed: number): void {
    this.petalMaterial.uniforms.uTime.value = elapsed;
    this.coreMaterial.uniforms.uTime.value = elapsed;
  }

  dispose(): void {
    this.petalMesh.geometry.dispose();
    this.petalMaterial.dispose();
    this.coreMesh.geometry.dispose();
    this.coreMaterial.dispose();
    this.removeFromParent();
  }
}
