import { WebGLRenderer, Scene, Camera, Vector2 } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class PostprocessingPipeline {
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  private filmPass!: FilmPass;
  private initialized = false;

  init(renderer: WebGLRenderer): void {
    if (this.initialized) return;

    this.composer = new EffectComposer(renderer);

    const dummyScene = new Scene();
    const dummyCamera = new Camera();
    const renderPass = new RenderPass(dummyScene, dummyCamera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new Vector2(window.innerWidth, window.innerHeight),
      1.5, // strength
      0.9, // radius
      0.6  // threshold
    );
    this.composer.addPass(this.bloomPass);

    // FilmPass for cinematic grit (intensity, grayscale)
    this.filmPass = new FilmPass(0.35, false);
    this.composer.addPass(this.filmPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    this.initialized = true;
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: Camera): void {
    if (!this.initialized) {
      renderer.render(scene, camera);
      return;
    }

    const renderPass = this.composer.passes[0] as RenderPass;
    renderPass.scene = scene;
    renderPass.camera = camera;

    this.composer.render();
  }

  resize(width: number, height: number, pixelRatio: number): void {
    if (this.composer) {
      this.composer.setSize(width, height);
      this.composer.setPixelRatio(pixelRatio);
    }
  }

  dispose(): void {
    if (this.composer) {
      this.composer.dispose();
    }
  }
}
