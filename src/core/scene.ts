import {
  Scene,
  DirectionalLight,
  PointLight,
  Mesh,
  SphereGeometry,
  ShaderMaterial,
  BackSide,
  type Texture,
} from 'three';
import { PALETTE, COLORS } from '@/utils/colors';

/**
 * Scene graph wrapper.
 *
 * Preconfigured with premium studio environment:
 * - Radial gradient backdrop (no void, no ground plane)
 * - 3-Point Cinematic Lighting:
 *   - Rim Light: Sharp, catching edges
 *   - Fill Light: Soft, cool
 *   - Core Light: Warm, pulsating from within
 */
export class InkblotScene {
  readonly instance: Scene;

  constructor() {
    this.instance = new Scene();

    // The dark studio backdrop ensures blooming stands out.
    this.instance.background = COLORS.background.clone();

    this.setupBackdrop();
    this.setupLights();
  }

  // ── Studio Backdrop ──────────────────────────────────────────────────────
  
  private setupBackdrop(): void {
    const geometry = new SphereGeometry(50, 32, 32);
    
    // Soft radial vignette shader
    const material = new ShaderMaterial({
      uniforms: {
        color1: { value: COLORS.surface.clone() },
        color2: { value: COLORS.background.clone() },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;
        void main() {
          // Calculate distance from center (0.5, 0.5)
          float dist = distance(vUv, vec2(0.5, 0.5));
          // Mix colors based on distance to create a soft vignette
          gl_FragColor = vec4(mix(color1, color2, smoothstep(0.0, 0.8, dist)), 1.0);
        }
      `,
      side: BackSide,
      depthWrite: false, // Ensure it's always drawn behind everything else
    });

    const backdrop = new Mesh(geometry, material);
    backdrop.name = 'studio-backdrop';
    this.instance.add(backdrop);
  }

  // ── Cinematic Lighting ───────────────────────────────────────────────────

  private setupLights(): void {
    // 1. Fill Light — dominant blue from front-top-left
    const fillLight = new DirectionalLight(PALETTE.dominant, 8.0);
    fillLight.position.set(-5, 5, 10);
    this.instance.add(fillLight);

    // 1b. Front Key Light - Bright white/blue from front-right
    // Reduced intensity so it doesn't blow out the bloom
    const frontKey = new DirectionalLight(PALETTE.textPrimary, 5.5);
    frontKey.position.set(5, 5, 10);
    this.instance.add(frontKey);

    // 2. Rim Light — support / primary-hover blue from the back-right
    const rimLight = new DirectionalLight(PALETTE.support, 15.0);
    rimLight.position.set(5, 2, -10);
    this.instance.add(rimLight);

    // 3. Core Light — Intense, warm/greenish (#10B981) point light situated inside 
    const coreLight = new PointLight(PALETTE.accent, 15.0, 15);
    coreLight.position.set(0, 0, 0); // Positioned at the origin, inside the flower
    this.instance.add(coreLight);
  }

  /** Apply an HDRI environment map — call once the texture is loaded. */
  setEnvironment(texture: Texture): void {
    this.instance.environment = texture;
  }

  dispose(): void {
    this.instance.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
