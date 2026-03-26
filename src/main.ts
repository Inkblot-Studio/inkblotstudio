import { Clock, Scene, OrthographicCamera, Raycaster, Vector2 } from 'three';
import { InkblotRenderer } from '@/core/renderer';
import { InkblotScene } from '@/core/scene';
import { InkblotCamera } from '@/core/camera';
import { InkblotControls } from '@/core/controls';
import { PostprocessingPipeline } from '@/postprocessing/pipeline';
import { ScrollSystem } from '@/systems/scrollSystem';
import { InteractionSystem } from '@/systems/interactionSystem';
import { AnimationSystem } from '@/systems/animationSystem';
import { AudioSystem } from '@/systems/audioSystem';
import { FluidFlowerComponent } from '@/components/fluidFlower';
import { CitronBloomComponent } from '@/components/citronBloomComponent';
import { AudioButtonComponent } from '@/components/audioButton';
import { Sections3DComponent } from '@/components/sections3D';
import type { FrameContext, ISystem, IComponent } from '@/types';
import { CitronBloomComposer } from '@citron-bloom-engine/bloom-postprocess/citronBloomComposer';
import { BLOOM_LOD_PROFILES, type BloomLod } from '@citron-bloom-engine/bloom-core/types';

/**
 * Production: Citron Bloom only with `?citronBloom` (optional `=medium` | `low`).
 * Development: Bloom is the default so `npm run dev` shows the engine; add `?fluid` for the raymarched flower.
 */
function parseCitronBloomMode(): { active: boolean; lod: BloomLod } {
  const params = new URLSearchParams(location.search);
  if (params.has('fluid')) {
    return { active: false, lod: 'high' };
  }
  const raw = params.get('citronBloom');
  const lodFrom = (v: string | null): BloomLod =>
    v === 'medium' || v === 'low' ? v : 'high';

  if (raw !== null) {
    return { active: true, lod: lodFrom(raw) };
  }
  if (import.meta.env.DEV) {
    return { active: true, lod: lodFrom(params.get('lod')) };
  }
  return { active: false, lod: 'high' };
}

type PostStack = PostprocessingPipeline | CitronBloomComposer;

class Inkblot {
  private readonly renderer: InkblotRenderer;
  private readonly scene: InkblotScene;
  private readonly camera: InkblotCamera;

  private readonly hudScene = new Scene();
  private readonly hudCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 10);
  private readonly raycaster = new Raycaster();

  private readonly controls: InkblotControls;
  private readonly postprocessing: PostStack;
  private readonly clock = new Clock();

  private readonly systems: ISystem[] = [];
  private readonly components: IComponent[] = [];

  private frameContext!: FrameContext;

  private readonly useCitronBloom: boolean;
  private readonly citronBloomLod: BloomLod;
  private fluidFlowerComponent: FluidFlowerComponent | null = null;
  private citronBloomComponent: CitronBloomComponent | null = null;

  private scrollSystem!: ScrollSystem;
  private interactionSystem!: InteractionSystem;
  private animationSystem!: AnimationSystem;
  private audioSystem!: AudioSystem;
  private audioButtonComponent!: AudioButtonComponent;
  private sections3DComponent!: Sections3DComponent;

  constructor() {
    const { active: useCitronBloom, lod: citronBloomLod } = parseCitronBloomMode();
    this.useCitronBloom = useCitronBloom;
    this.citronBloomLod = citronBloomLod;

    const container = document.getElementById('canvas-container');
    if (!container) throw new Error('Missing #canvas-container element');

    this.renderer = new InkblotRenderer({ container });
    this.scene = new InkblotScene();
    this.camera = new InkblotCamera();
    this.controls = new InkblotControls(
      this.camera.instance,
      this.renderer.instance.domElement,
    );

    if (useCitronBloom) {
      const profile = BLOOM_LOD_PROFILES[citronBloomLod];
      this.postprocessing = new CitronBloomComposer({
        bloomStrength: profile.bloomStrength,
        bloomRadius: 0.5,
        bloomThreshold: 0.68,
        enableDof: profile.enableDof,
      });
    } else {
      this.postprocessing = new PostprocessingPipeline();
    }

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
    this.audioButtonComponent = new AudioButtonComponent();
    this.sections3DComponent = new Sections3DComponent();

    if (this.useCitronBloom) {
      this.citronBloomComponent = new CitronBloomComponent(
        this.citronBloomLod,
        this.interactionSystem,
      );
      this.components.push(
        this.citronBloomComponent,
        this.audioButtonComponent,
        this.sections3DComponent,
      );
    } else {
      this.fluidFlowerComponent = new FluidFlowerComponent();
      this.components.push(
        this.fluidFlowerComponent,
        this.audioButtonComponent,
        this.sections3DComponent,
      );
    }
  }

  private init(): void {
    this.camera.resize(this.renderer.viewport);

    if (this.postprocessing instanceof CitronBloomComposer) {
      this.postprocessing.init(
        this.renderer.instance,
        this.scene.instance,
        this.camera.instance,
      );
    } else {
      this.postprocessing.init(this.renderer.instance);
    }

    for (const system of this.systems) {
      system.init(this.frameContext);
    }
    for (const component of this.components) {
      component.init(this.frameContext);
    }

    this.scene.instance.remove(this.audioButtonComponent.mesh);
    this.hudScene.add(this.audioButtonComponent.mesh);
    this.audioButtonComponent.setSystems(this.audioSystem, this.interactionSystem);

    if (this.useCitronBloom && this.citronBloomComponent) {
      const hud = document.getElementById('citron-bloom-hud');
      const bloom = this.citronBloomComponent;
      if (hud) {
        void import('@citron-bloom-engine/bloom-ui/mountBloomHud').then(({ mountBloomHud }) => {
          mountBloomHud(hud, {
            onBloomMore: () => {
              window.scrollTo({
                top: Math.max(document.body.scrollHeight - window.innerHeight, 0),
                behavior: 'smooth',
              });
            },
            onBloomLess: () => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            },
          });
        });
      }
    }

    this.onResize();

    window.addEventListener('resize', this.onResize);
    window.addEventListener('click', this.onClick);
    this.renderer.instance.setAnimationLoop(this.tick);
  }

  private onClick = (e: MouseEvent): void => {
    const pointer = new Vector2();
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(pointer, this.hudCamera);
    const intersects = this.raycaster.intersectObject(this.audioButtonComponent.mesh);

    if (intersects.length > 0) {
      this.audioSystem.toggleAudio();
    }
  };

  private tick = (): void => {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    this.frameContext.delta = delta;
    this.frameContext.elapsed = elapsed;

    for (const system of this.systems) {
      system.update(this.frameContext);
    }

    if (this.citronBloomComponent && this.scrollSystem) {
      this.citronBloomComponent.setBloomFromScroll(this.scrollSystem.progress);
    }

    for (const component of this.components) {
      component.update(this.frameContext);
    }

    if (this.animationSystem && this.scrollSystem) {
      this.animationSystem.setScrollProgress(this.scrollSystem.progress);
    }

    if (this.sections3DComponent && this.scrollSystem) {
      this.sections3DComponent.setInteractionValues(this.scrollSystem.progress);
    }

    if (this.fluidFlowerComponent && this.scrollSystem && this.audioSystem) {
      this.fluidFlowerComponent.setInteractionValues(
        this.scrollSystem.progress,
        this.audioSystem.lowFrequencyVolume,
      );
    }

    this.camera.update(delta);
    this.controls.update();

    this.postprocessing.render(
      this.renderer.instance,
      this.scene.instance,
      this.camera.instance,
    );

    this.renderer.instance.autoClear = false;
    this.renderer.instance.render(this.hudScene, this.hudCamera);
    this.renderer.instance.autoClear = true;
  };

  private onResize = (): void => {
    this.renderer.resize();
    this.camera.resize(this.renderer.viewport);

    const { width, height, pixelRatio } = this.renderer.viewport;
    this.postprocessing.resize(width, height, pixelRatio);

    const aspect = width / height;
    this.hudCamera.left = -aspect;
    this.hudCamera.right = aspect;
    this.hudCamera.top = 1;
    this.hudCamera.bottom = -1;
    this.hudCamera.updateProjectionMatrix();

    const paddingX = 0.15;
    const paddingY = 0.15;
    const size = 0.2;
    this.audioButtonComponent.mesh.scale.set(size, size, 1);
    this.audioButtonComponent.mesh.position.set(aspect - paddingX - size / 2, -1 + paddingY + size / 2, 0);
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
