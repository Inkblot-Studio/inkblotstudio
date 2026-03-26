import {
  Camera,
  HalfFloatType,
  LinearFilter,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UniformsUtils,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import type { WebGLRenderer } from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const blendShader = {
  uniforms: {
    tSceneA: { value: null },
    tSceneB: { value: null },
    uBlend: { value: 0 },
    uTime: { value: 0 },
    uParallax: { value: new Vector2(0, 0) },
    uDistortion: { value: 0.032 },
    uTransitionFx: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tSceneA;
    uniform sampler2D tSceneB;
    uniform float uBlend;
    uniform float uTime;
    uniform vec2 uParallax;
    uniform float uDistortion;
    uniform float uTransitionFx;
    varying vec2 vUv;

    void main() {
      float t = clamp(uBlend, 0.0, 1.0);
      float mid = 1.0 - abs(t - 0.5) * 2.0;
      float fx = clamp(uTransitionFx, 0.0, 1.0);

      float wob = sin(uTime * 1.15 + vUv.y * 14.0) * cos(uTime * 0.85 + vUv.x * 11.0);
      vec2 warp = vec2(wob, -wob * 0.65) * uDistortion * mid * fx;

      vec2 uvA = vUv + uParallax * 0.042 * (1.0 - t) * fx + warp * (1.0 - t);
      vec2 uvB = vUv - uParallax * 0.055 * t * fx - warp * t;

      vec4 a = texture2D(tSceneA, uvA);
      vec4 b = texture2D(tSceneB, uvB);

      float mixF = smoothstep(0.04, 0.96, t);
      gl_FragColor = mix(a, b, mixF);
    }
  `,
};

/**
 * Renders two scenes to internal targets, then composites with UV warp and parallax-style offsets.
 * Intended as the first pass in an EffectComposer stack (needsSwap: false, writes to readBuffer).
 */
export class DualSceneBlendPass extends Pass {
  sceneA: Scene;
  sceneB: Scene;
  camera: Camera;

  private readonly rtA: WebGLRenderTarget;
  private readonly rtB: WebGLRenderTarget;
  private readonly fsQuad: FullScreenQuad;
  private readonly material: ShaderMaterial;

  blend = 0;
  time = 0;
  readonly parallax = new Vector2(0, 0);
  distortionStrength = 0.032;
  transitionFx = 0;

  constructor(sceneA: Scene, sceneB: Scene, camera: Camera, width: number, height: number) {
    super();
    this.sceneA = sceneA;
    this.sceneB = sceneB;
    this.camera = camera;
    this.needsSwap = false;
    this.clear = true;

    this.rtA = new WebGLRenderTarget(width, height, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      format: RGBAFormat,
      type: HalfFloatType,
    });
    this.rtB = this.rtA.clone();
    this.rtA.texture.name = 'DualSceneBlend.rtA';
    this.rtB.texture.name = 'DualSceneBlend.rtB';

    this.material = new ShaderMaterial({
      name: 'DualSceneBlend',
      uniforms: UniformsUtils.clone(blendShader.uniforms),
      vertexShader: blendShader.vertexShader,
      fragmentShader: blendShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }

  setBlend(n: number): void {
    this.blend = n;
  }

  setDistortion(n: number): void {
    this.distortionStrength = n;
  }

  setTransitionFx(n: number): void {
    this.transitionFx = Math.max(0, Math.min(1, n));
  }

  render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget,
    deltaTime?: number,
  ): void {
    void writeBuffer;
    void deltaTime;

    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = true;

    renderer.setRenderTarget(this.rtA);
    renderer.clear(true, true, true);
    renderer.render(this.sceneA, this.camera);

    renderer.setRenderTarget(this.rtB);
    renderer.clear(true, true, true);
    renderer.render(this.sceneB, this.camera);

    this.material.uniforms.tSceneA.value = this.rtA.texture;
    this.material.uniforms.tSceneB.value = this.rtB.texture;
    this.material.uniforms.uBlend.value = this.blend;
    this.material.uniforms.uTime.value = this.time;
    this.material.uniforms.uParallax.value.copy(this.parallax);
    this.material.uniforms.uDistortion.value = this.distortionStrength;
    this.material.uniforms.uTransitionFx.value = this.transitionFx;

    const target = this.renderToScreen ? null : readBuffer;
    renderer.setRenderTarget(target);
    if (this.clear && target) {
      renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
    }
    this.fsQuad.render(renderer);

    renderer.autoClear = oldAutoClear;
  }

  setSize(width: number, height: number): void {
    this.rtA.setSize(width, height);
    this.rtB.setSize(width, height);
  }

  dispose(): void {
    this.rtA.dispose();
    this.rtB.dispose();
    this.material.dispose();
    this.fsQuad.dispose();
  }
}
