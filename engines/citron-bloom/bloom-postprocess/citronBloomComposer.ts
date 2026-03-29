import { Camera, Scene, Vector2, WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { DualSceneBlendPass } from './dualSceneBlendPass';
import { createJourneyVisualPass } from './journeyVisualPass';

const colorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uContrast: { value: 1.08 },
    uSaturation: { value: 1.12 },
    uWarmth: { value: -0.035 },
    uVignette: { value: 0.35 },
    /** Corrects vignette to circular in screen space (width / height). */
    uVignetteAspect: { value: 1.0 },
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
    uniform float uVignette;
    uniform float uVignetteAspect;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      col = (col - 0.5) * uContrast + 0.5;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, uSaturation);
      col.r += uWarmth * 0.06;
      col.b -= uWarmth * 0.08;
      vec2 vp = vUv - vec2(0.5);
      vp.x *= uVignetteAspect;
      float vig = length(vp) * uVignette;
      col *= 1.0 - vig * vig;
      gl_FragColor = vec4(col, c.a);
    }
  `,
};

const volumetricGlowShader = {
  uniforms: {
    tDiffuse: { value: null },
    uStrength: { value: 0.14 },
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
  /** Screen-space halo strength on `volumetricGlowShader` (default 0.07). */
  glowStrength?: number;
  /** Film grain intensity passed to `FilmPass` (default 0.006). */
  filmIntensity?: number;
  /** Color grade pass — defaults match legacy cinematic stack. */
  gradeContrast?: number;
  gradeSaturation?: number;
  gradeWarmth?: number;
  /** Vignette strength multiplier (default 0.35). */
  gradeVignette?: number;
  /** Initial aspect ratio for vignette (width / height); updated in {@link resize}. */
  gradeVignetteAspect?: number;
}

/** Drives {@link CitronBloomComposer.setJourneyVisual} from scroll journey + bloom experience id. */
export interface BloomJourneyVisualState {
  /** Journey section 0–5, or 20=stomp, 21=particleforest, 22=particleinterior. */
  style: number;
  localT: number;
  /** 0–1 pulse on section boundary (decay in caller). */
  pulse: number;
  elapsed: number;
}

/**
 * Cinematic stack: HDR bloom, optional depth-of-field, subtle screen-space glow, color grade.
 */
export class CitronBloomComposer {
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  private gradePass!: ShaderPass;
  private glowPass!: ShaderPass;
  private filmPass!: FilmPass;
  private bokehPass: BokehPass | null = null;
  private renderPass: RenderPass | null = null;
  private dualBlendPass: DualSceneBlendPass | null = null;
  private journeyVisualPass: ReturnType<typeof createJourneyVisualPass> | null = null;
  private initialized = false;
  private readonly options: CitronBloomComposerOptions;

  constructor(options: CitronBloomComposerOptions = {}) {
    this.options = options;
  }

  /**
   * @param secondaryScene When set, the first pass blends scene A (flower) into this scene with scroll-driven distortion instead of a single RenderPass.
   */
  init(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    secondaryScene?: Scene,
  ): void {
    if (this.initialized) return;

    this.composer = new EffectComposer(renderer);
    const w = window.innerWidth * renderer.getPixelRatio();
    const h = window.innerHeight * renderer.getPixelRatio();

    if (secondaryScene) {
      this.dualBlendPass = new DualSceneBlendPass(scene, secondaryScene, camera, w, h);
      this.composer.addPass(this.dualBlendPass);
    } else {
      this.renderPass = new RenderPass(scene, camera);
      this.composer.addPass(this.renderPass);
    }

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
      this.options.bloomStrength ?? 0.72,
      this.options.bloomRadius ?? 0.42,
      this.options.bloomThreshold ?? 0.78,
    );
    this.composer.addPass(this.bloomPass);

    this.glowPass = new ShaderPass(volumetricGlowShader);
    this.glowPass.uniforms.uStrength.value = this.options.glowStrength ?? 0.07;
    this.composer.addPass(this.glowPass);

    this.gradePass = new ShaderPass(colorGradeShader);
    this.gradePass.uniforms.uContrast.value = this.options.gradeContrast ?? 1.08;
    this.gradePass.uniforms.uSaturation.value = this.options.gradeSaturation ?? 1.12;
    this.gradePass.uniforms.uWarmth.value = this.options.gradeWarmth ?? -0.035;
    this.gradePass.uniforms.uVignette.value = this.options.gradeVignette ?? 0.35;
    this.gradePass.uniforms.uVignetteAspect.value =
      this.options.gradeVignetteAspect ?? w / Math.max(1, h);
    this.composer.addPass(this.gradePass);

    this.filmPass = new FilmPass(this.options.filmIntensity ?? 0.006, false);
    this.composer.addPass(this.filmPass);

    this.journeyVisualPass = createJourneyVisualPass();
    this.composer.addPass(this.journeyVisualPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    this.initialized = true;
  }

  /**
   * Drive dual-scene crossfade (0 = primary only, 1 = secondary only).
   * `transitionFx01` gates time-warp, pointer parallax, and film grain — use 0 mid-act, ~1 at section edges.
   */
  setSceneTransition(
    blend01: number,
    parallaxNdcX = 0,
    parallaxNdcY = 0,
    transitionFx01 = 0,
  ): void {
    if (!this.dualBlendPass) return;
    this.dualBlendPass.setBlend(blend01);
    this.dualBlendPass.parallax.set(parallaxNdcX, parallaxNdcY);
    this.dualBlendPass.setTransitionFx(transitionFx01);
    const fx = Math.max(0, Math.min(1, transitionFx01));
    // Calmer swim at low transition weight; full strength only near act edges.
    const distMul = 0.38 + fx * 0.62;
    this.dualBlendPass.setDistortion(0.032 * distMul);
    (this.filmPass.uniforms as { intensity: { value: number } }).intensity.value = 0.006 + fx * 0.048;
  }

  /** Per-section / per-experience fullscreen treatment (pulse on journey cuts, idle look otherwise). */
  setJourneyVisual(state: BloomJourneyVisualState): void {
    if (!this.journeyVisualPass) return;
    const u = this.journeyVisualPass.journeyUniforms;
    u.uStyle.value = state.style;
    u.uLocalT.value = state.localT;
    u.uPulse.value = state.pulse;
    u.uTime.value = state.elapsed;
  }

  /** Fullscreen fade for programmatic bloom experience swaps (0 = none, 1 = black). */
  setExperienceBlackout(alpha01: number): void {
    if (!this.journeyVisualPass) return;
    this.journeyVisualPass.journeyUniforms.uBlackout.value = Math.max(0, Math.min(1, alpha01));
  }

  hasDualSceneBlend(): boolean {
    return this.dualBlendPass !== null;
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: Camera, elapsed = 0): void {
    if (!this.initialized) {
      renderer.render(scene, camera);
      return;
    }
    if (this.dualBlendPass) {
      this.dualBlendPass.sceneA = scene;
      this.dualBlendPass.camera = camera;
      this.dualBlendPass.time = elapsed;
    } else if (this.renderPass) {
      this.renderPass.scene = scene;
      this.renderPass.camera = camera;
    }
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
    const h = Math.max(1, height * pixelRatio);
    const w = Math.max(1, width * pixelRatio);
    (this.gradePass.uniforms as { uVignetteAspect: { value: number } }).uVignetteAspect.value =
      w / h;
  }

  setBloomStrength(n: number): void {
    if (this.bloomPass) this.bloomPass.strength = n;
  }

  dispose(): void {
    this.dualBlendPass?.dispose();
    this.dualBlendPass = null;
    this.renderPass = null;
    if (this.composer) this.composer.dispose();
  }
}
