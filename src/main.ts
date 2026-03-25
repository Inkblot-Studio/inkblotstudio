import { Clock } from 'three';
import { InkblotRenderer } from '@/core/renderer';
import { InkblotScene } from '@/core/scene';
import { InkblotCamera } from '@/core/camera';
import { InkblotControls } from '@/core/controls';
import { PostprocessingPipeline } from '@/postprocessing/pipeline';
import { ScrollSystem } from '@/systems/scrollSystem';
import { InteractionSystem } from '@/systems/interactionSystem';
import { AnimationSystem } from '@/systems/animationSystem';
import { AudioSystem } from '@/systems/audioSystem';
import { PlaceholderComponent } from '@/components/placeholder';
import { PremiumFlowerComponent } from '@/components/premiumFlower';
import type { FrameContext, ISystem, IComponent } from '@/types';

class Inkblot {
  private readonly renderer: InkblotRenderer;
  private readonly scene: InkblotScene;
  private readonly camera: InkblotCamera;
  private readonly controls: InkblotControls;
  private readonly postprocessing: PostprocessingPipeline;
  private readonly clock = new Clock();

  private readonly systems: ISystem[] = [];
  private readonly components: IComponent[] = [];

  private frameContext!: FrameContext;

  constructor() {
    const container = document.getElementById('canvas-container');
    if (!container) throw new Error('Missing #canvas-container element');

    this.renderer = new InkblotRenderer({ container });
    this.scene = new InkblotScene();
    this.camera = new InkblotCamera();
    this.controls = new InkblotControls(
      this.camera.instance,
      this.renderer.instance.domElement,
    );
    this.postprocessing = new PostprocessingPipeline();

    this.frameContext = {
      renderer: this.renderer.instance,
      scene: this.scene.instance,
      camera: this.camera.instance,
      delta: 0,
      elapsed: 0,
    };

    this.registerSystems();
    this.registerComponents();
    this.init();
  }

  private scrollSystem!: ScrollSystem;
  private interactionSystem!: InteractionSystem;
  private animationSystem!: AnimationSystem;
  private audioSystem!: AudioSystem;
  private premiumFlowerComponent!: PremiumFlowerComponent;

  private registerSystems(): void {
    this.animationSystem = new AnimationSystem(this.camera);
    this.scrollSystem = new ScrollSystem();
    this.interactionSystem = new InteractionSystem();
    this.audioSystem = new AudioSystem();
    
    this.systems.push(
      this.scrollSystem,
      this.interactionSystem,
      this.animationSystem,
      this.audioSystem,
    );
  }

  private registerComponents(): void {
    this.premiumFlowerComponent = new PremiumFlowerComponent();

    this.components.push(
      this.premiumFlowerComponent,
    );
  }

  private init(): void {
    this.camera.resize(this.renderer.viewport);
    this.postprocessing.init(this.renderer.instance);

    for (const system of this.systems) {
      system.init(this.frameContext);
    }
    for (const component of this.components) {
      component.init(this.frameContext);
    }

    window.addEventListener('resize', this.onResize);
    this.renderer.instance.setAnimationLoop(this.tick);
  }

  private tick = (): void => {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    this.frameContext.delta = delta;
    this.frameContext.elapsed = elapsed;

    for (const system of this.systems) {
      system.update(this.frameContext);
    }
    for (const component of this.components) {
      component.update(this.frameContext);
    }

    // Connect scroll system to animation system to drive camera Z-depth
    if (this.animationSystem && this.scrollSystem) {
      this.animationSystem.setScrollProgress(this.scrollSystem.progress);
    }

    if (this.premiumFlowerComponent && this.scrollSystem && this.audioSystem) {
      this.premiumFlowerComponent.setInteractionValues(
        this.scrollSystem.progress,
        this.audioSystem.lowFrequencyVolume
      );
    }

    this.camera.update(delta);
    this.controls.update();

    this.postprocessing.render(
      this.renderer.instance,
      this.scene.instance,
      this.camera.instance,
    );
  };

  private onResize = (): void => {
    this.renderer.resize();
    this.camera.resize(this.renderer.viewport);

    const { width, height, pixelRatio } = this.renderer.viewport;
    this.postprocessing.resize(width, height, pixelRatio);
  };

  dispose(): void {
    this.renderer.instance.setAnimationLoop(null);
    window.removeEventListener('resize', this.onResize);

    for (const component of this.components) component.dispose();
    for (const system of this.systems) system.dispose();

    this.postprocessing.dispose();
    this.controls.dispose();
    this.scene.dispose();
    this.renderer.dispose();
  }
}

new Inkblot();
