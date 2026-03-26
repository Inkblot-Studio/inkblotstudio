import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  FloatType,
  HalfFloatType,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import particleVert from './shaders/particle.vert';
import particleFrag from './shaders/particle.frag';
import particleComputeFrag from './shaders/particleCompute.frag';
import { BloomTokens } from '../bloom-core/tokens';

export interface GpgpuParticlesOptions {
  textureSize: number;
}

/**
 * GPUComputationRenderer-driven positions; points sample the latest position texture.
 */
export class GpgpuParticles {
  readonly points: Points;
  private readonly gpu: GPUComputationRenderer;
  /** GPUComputation variable (texturePosition). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly posVar: any;
  private readonly size: number;
  private readonly attract = new Vector3(0, 1.1, 0);
  private readonly pointer = new Vector2(0, 0);
  pointerStrength = 0.09;

  constructor(renderer: WebGLRenderer, options: GpgpuParticlesOptions) {
    this.size = options.textureSize;

    this.gpu = new GPUComputationRenderer(this.size, this.size, renderer);
    this.gpu.setDataType(renderer.capabilities.isWebGL2 ? FloatType : HalfFloatType);

    const pos0 = this.gpu.createTexture();
    const data = pos0.image.data as Float32Array;
    for (let i = 0; i < data.length; i += 4) {
      const u = Math.random() * Math.PI * 2;
      const r = 0.12 + Math.random() * 0.9;
      data[i] = Math.cos(u) * r * 0.55;
      data[i + 1] = (Math.random() - 0.5) * 1.1;
      data[i + 2] = Math.sin(u) * r * 0.55;
      data[i + 3] = 1;
    }
    pos0.needsUpdate = true;

    this.posVar = this.gpu.addVariable('texturePosition', particleComputeFrag, pos0);
    this.gpu.setVariableDependencies(this.posVar, [this.posVar]);
    this.posVar.material.uniforms.uTime = { value: 0 };
    this.posVar.material.uniforms.uAttract = { value: this.attract };
    this.posVar.material.uniforms.uPointer = { value: this.pointer };
    this.posVar.material.uniforms.uPointerStrength = { value: this.pointerStrength };

    const err = this.gpu.init();
    if (err) {
      console.warn('[Citron Bloom] GPGPU init:', err);
    }

    const count = this.size * this.size;
    const geo = new BufferGeometry();
    const refs = new Float32Array(count * 2);
    const z = new Float32Array(count * 3);
    let k = 0;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        refs[k++] = (x + 0.5) / this.size;
        refs[k++] = (y + 0.5) / this.size;
      }
    }
    geo.setAttribute('position', new BufferAttribute(z, 3));
    geo.setAttribute('aRef', new BufferAttribute(refs, 2));

    const tex = this.gpu.getCurrentRenderTarget(this.posVar).texture;
    const pMat = new ShaderMaterial({
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      uniforms: {
        uPositions: { value: tex },
        uSize: { value: 2.0 },
        uColorCore: { value: BloomTokens.citron400.clone() },
        uColorEdge: { value: BloomTokens.citron300.clone() },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    this.points = new Points(geo, pMat);
    this.points.frustumCulled = false;
  }

  setPointerWorld(x: number, z: number): void {
    this.pointer.set(x, z);
  }

  setAttract(y: number): void {
    this.attract.y = y;
  }

  update(elapsed: number): void {
    this.posVar.material.uniforms.uTime.value = elapsed;
    this.posVar.material.uniforms.uPointerStrength.value = this.pointerStrength;
    this.gpu.compute();
    const tex = this.gpu.getCurrentRenderTarget(this.posVar).texture;
    (this.points.material as ShaderMaterial).uniforms.uPositions.value = tex;
  }

  dispose(): void {
    this.gpu.dispose();
    this.points.geometry.dispose();
    (this.points.material as ShaderMaterial).dispose();
    this.points.removeFromParent();
  }
}
