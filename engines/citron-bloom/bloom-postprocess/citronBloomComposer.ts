import { Camera, Scene, Vector2, WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

const colorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uContrast: { value: 1.08 },
    uSaturation: { value: 1.12 },
    uWarmth: { value: -0.035 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uWarmth;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      col = (col - 0.5) * uContrast + 0.5;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, uSaturation);
      col.r += uWarmth * 0.06;
      col.b -= uWarmth * 0.08;
      float vig = distance(vUv, vec2(0.5)) * 0.35;
      col *= 1.0 - vig * vig;
      gl_FragColor = vec4(col, c.a);
    }
  `,
};

const volumetricGlowShader = {
  uniforms: {
    tDiffuse: { value: null },
    uStrength: { value: 0.22 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uStrength;
    varying vec2 vUv;
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float r = length(d);
      float halo = exp(-r * r * 3.2) * uStrength;
      vec3 glow = base.rgb + vec3(0.38, 0.65, 0.98) * halo;
      gl_FragColor = vec4(glow, base.a);
    }
  `,
};

export interface CitronBloomComposerOptions {
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
  enableDof?: boolean;
  bokehFocus?: number;
  bokehAperture?: number;
}

/**
 * Cinematic stack: HDR bloom, optional depth-of-field, subtle screen-space glow, color grade.
 */
export class CitronBloomComposer {
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  private gradePass!: ShaderPass;
  private glowPass!: ShaderPass;
  private bokehPass: BokehPass | null = null;
  private initialized = false;
  private readonly options: CitronBloomComposerOptions;

  constructor(options: CitronBloomComposerOptions = {}) {
    this.options = options;
  }

  init(renderer: WebGLRenderer, scene: Scene, camera: Camera): void {
    if (this.initialized) return;

    this.composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    if (this.options.enableDof) {
      this.bokehPass = new BokehPass(scene, camera, {
        focus: this.options.bokehFocus ?? 3.2,
        aperture: this.options.bokehAperture ?? 0.004,
        maxblur: 0.006,
      });
      this.composer.addPass(this.bokehPass);
    }

    this.bloomPass = new UnrealBloomPass(
      new Vector2(window.innerWidth, window.innerHeight),
      this.options.bloomStrength ?? 1.15,
      this.options.bloomRadius ?? 0.55,
      this.options.bloomThreshold ?? 0.72,
    );
    this.composer.addPass(this.bloomPass);

    this.glowPass = new ShaderPass(volumetricGlowShader);
    this.glowPass.uniforms.uStrength.value = 0.18;
    this.composer.addPass(this.glowPass);

    this.gradePass = new ShaderPass(colorGradeShader);
    this.composer.addPass(this.gradePass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    this.initialized = true;
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: Camera): void {
    if (!this.initialized) {
      renderer.render(scene, camera);
      return;
    }
    const rp = this.composer.passes[0] as RenderPass;
    rp.scene = scene;
    rp.camera = camera;
    if (this.bokehPass) {
      this.bokehPass.scene = scene;
      this.bokehPass.camera = camera;
    }
    this.composer.render();
  }

  resize(width: number, height: number, pixelRatio: number): void {
    if (!this.composer) return;
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(pixelRatio);
    this.bloomPass.setSize(width, height);
  }

  setBloomStrength(n: number): void {
    if (this.bloomPass) this.bloomPass.strength = n;
  }

  dispose(): void {
    if (this.composer) this.composer.dispose();
  }
}
