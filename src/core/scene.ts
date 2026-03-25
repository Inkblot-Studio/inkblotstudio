import {
  Scene,
  Color,
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
        color1: { value: new Color('#0b1220') }, // Center
        color2: { value: new Color('#020617') }, // Edges
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
    // 1. Fill Light — Soft, cool blue (#2563EB) coming from front-top-left
    const fillLight = new DirectionalLight(PALETTE.primary, 0.5);
    fillLight.position.set(-5, 5, 5);
    this.instance.add(fillLight);

    // 2. Rim Light — Sharp, high-intensity hover blue (#60A5FA) from the back-right
    // to catch the microscopic edges of the petals.
    const rimLight = new DirectionalLight(PALETTE.primaryHover, 2.0);
    rimLight.position.set(5, 2, -10);
    this.instance.add(rimLight);

    // 3. Core Light — Intense, warm/greenish (#10B981) point light situated inside 
    // the flower to give it an internal glow that bleeds through via subsurface scattering.
    const coreLight = new PointLight(PALETTE.accent, 2.5, 10);
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
