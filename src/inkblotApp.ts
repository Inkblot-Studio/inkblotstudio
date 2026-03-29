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
import { FluidFlowerComponent } from '@/components/fluidFlower';
import { CitronBloomComponent } from '@/components/citronBloomComponent';
import { SideCurtainParticlesComponent } from '@/components/sideCurtainParticles';
import { Sections3DComponent } from '@/components/sections3D';
import type { FrameContext, ISystem, IComponent } from '@/types';
import { smoothstep } from '@/utils/math';
import {
  createBloomTransitionScene,
  type BloomTransitionSceneHandle,
} from '@citron-bloom-engine/examples/createBloomTransitionScene';
import { CitronBloomComposer } from '@citron-bloom-engine/bloom-postprocess/citronBloomComposer';
import { BloomExperienceSwapController } from '@citron-bloom-engine/bloom-runtime/bloomExperienceTransition';
import { resolveBloomJourneyVisualStyle } from '@citron-bloom-engine/bloom-runtime/bloomJourneyVisualStyle';
import { bloomScrollDrive } from '@citron-bloom-engine/bloom-runtime/flowerBloomExperience';
import {
  FLOWER_CAMERA_CLEARANCE_ABOVE_GROUND,
  FLOWER_GROUND_PLANE_WORLD_Y,
} from '@citron-bloom-engine/bloom-runtime/flowerStageConstants';
import {
  createPointerLiquidRibbon,
  type PointerLiquidRibbonHandle,
} from '@citron-bloom-engine/bloom-flora/createPointerLiquidRibbon';
import {
  citronBloomComposerOptionsForFlowerExperience,
  citronBloomComposerOptionsForLod,
  transmissionResolutionScaleForBloomLod,
} from '@citron-bloom-engine/bloom-runtime';
import { bloomExperienceRegistry } from '@citron-bloom-engine/bloom-runtime/bloomExperienceRegistry';
import type { BloomLod } from '@citron-bloom-engine/bloom-core/types';
import {
  createStudioEnvironment,
  type StudioEnvironmentHandle,
} from '@/core/studioEnvironment';
import { initCookieConsent } from '@/ui/cookieConsent';
import { initNavChrome, updateNavChrome } from '@/ui/navChrome';
import { PORTFOLIO_PROJECTS } from '@/data/portfolioProjects';
import {
  computeJourneyDualSceneBlend,
  computeJourneySectionTransitionFx,
  journeyCumulativeStops,
  resolveJourney,
} from '@/journey/sectionMap';
import {
  createJourneyWebScene,
  setMeshTreeOpacity,
  syncJourneyFog,
  type JourneyWebSceneHandle,
} from '@/journey/journeyWebScene';
import { initPortfolioChat } from '@/ui/portfolioChatStub';
import {
  clearPortfolioScrollNavigator,
  registerPortfolioScrollNavigator,
} from '@/ui/portfolioNavigator';

/**
 * Citron Bloom is the default experience. Use `?fluid` for the legacy raymarched flower, or
 * `?citronBloom=0` / `?classic=1` for the older sections + fluid stack.
 */
function parseCitronBloomMode(): { active: boolean; lod: BloomLod } {
  const params = new URLSearchParams(location.search);
  if (params.has('fluid')) {
    return { active: false, lod: 'high' };
  }
  const optOut =
    params.get('citronBloom') === '0' ||
    params.get('citronBloom') === 'false' ||
    params.get('classic') === '1';
  if (optOut) {
    return { active: false, lod: 'high' };
  }
  const lodFrom = (v: string | null): BloomLod =>
    v === 'medium' || v === 'low' ? v : 'high';
  const raw = params.get('citronBloom');
  if (raw !== null && raw !== '' && raw !== 'true' && raw !== '1') {
    return { active: true, lod: lodFrom(raw) };
  }
  return { active: true, lod: lodFrom(params.get('lod')) };
}

/** `?experience=stomp` — iridescent stomp + floating video tiles; default `flower`. */
function parseBloomExperienceId(): string {
  const raw = new URLSearchParams(location.search).get('experience');
  if (raw && /^[a-z0-9_-]+$/i.test(raw)) {
    return raw.toLowerCase();
  }
  return 'flower';
}

type PostStack = PostprocessingPipeline | CitronBloomComposer;

export class Inkblot {
  private readonly renderer: InkblotRenderer;
  private readonly scene: InkblotScene;
  private readonly camera: InkblotCamera;

  private readonly controls: InkblotControls;
  private readonly postprocessing: PostStack;
  private readonly clock = new Clock();

  private readonly systems: ISystem[] = [];
  private readonly components: IComponent[] = [];

  private frameContext!: FrameContext;

  private readonly useCitronBloom: boolean;
  private readonly citronBloomLod: BloomLod;
  private readonly bloomExperienceId: string;
  /** Effective experience after optional in-runtime {@link BloomExperienceSwapController} swap. */
  private activeBloomExperienceId: string;
  private fluidFlowerComponent: FluidFlowerComponent | null = null;
  private citronBloomComponent: CitronBloomComponent | null = null;

  private scrollSystem!: ScrollSystem;
  private interactionSystem!: InteractionSystem;
  private animationSystem!: AnimationSystem;
  private audioSystem!: AudioSystem;
  private sections3DComponent: Sections3DComponent | null = null;
  private journeyWeb: JourneyWebSceneHandle | null = null;
  private prevJourneySection: number | null = null;
  private journeyTransitionPulse = 0;
  private transitionSceneHandle: BloomTransitionSceneHandle | null = null;
  private readonly bloomSwap = new BloomExperienceSwapController();
  private studioEnvironment: StudioEnvironmentHandle | null = null;
  private liquidRibbon: PointerLiquidRibbonHandle | null = null;
  private sideCurtainParticles: SideCurtainParticlesComponent | null = null;

  constructor(container: HTMLElement) {
    const { active: useCitronBloom, lod: citronBloomLod } = parseCitronBloomMode();
    this.useCitronBloom = useCitronBloom;
    this.citronBloomLod = citronBloomLod;
    this.bloomExperienceId = useCitronBloom ? parseBloomExperienceId() : 'flower';
    this.activeBloomExperienceId = this.bloomExperienceId;

    document.body.classList.toggle('citron-bloom-mode', useCitronBloom);
    document.body.classList.toggle(
      'experience-stomp',
      useCitronBloom && this.bloomExperienceId === 'stomp',
    );
    document.body.classList.toggle(
      'journey-flower-active',
      useCitronBloom && this.bloomExperienceId === 'flower',
    );

    this.renderer = new InkblotRenderer({
      container,
      transmissionResolutionScale: useCitronBloom
        ? transmissionResolutionScaleForBloomLod(citronBloomLod)
        : 1,
    });
    this.scene = new InkblotScene();
    this.camera = new InkblotCamera();
    this.controls = new InkblotControls(
      this.camera.instance,
      this.renderer.instance.domElement,
    );

    if (useCitronBloom) {
      const composerOpts =
        this.bloomExperienceId === 'flower'
          ? citronBloomComposerOptionsForFlowerExperience(citronBloomLod)
          : citronBloomComposerOptionsForLod(citronBloomLod);
      this.postprocessing = new CitronBloomComposer(composerOpts);
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
    const cameraMode = this.useCitronBloom ? 'delicate' : 'orbit';
    this.animationSystem = new AnimationSystem(this.camera, cameraMode);
    this.scrollSystem = new ScrollSystem();
    this.interactionSystem = new InteractionSystem();
    this.audioSystem = new AudioSystem();

    if (this.useCitronBloom) {
      this.camera.setDampFactor(
        this.bloomExperienceId === 'flower' ? 12.5 : 1.42,
      );
    }

    this.systems.push(
      this.scrollSystem,
      this.interactionSystem,
      this.animationSystem,
      this.audioSystem,
    );
  }

  private registerComponents(): void {
    if (this.useCitronBloom) {
      this.citronBloomComponent = new CitronBloomComponent(
        this.citronBloomLod,
        this.bloomExperienceId,
        this.interactionSystem,
      );
      this.components.push(this.citronBloomComponent);
      this.sideCurtainParticles = new SideCurtainParticlesComponent(
        () => this.useCitronBloom && this.activeBloomExperienceId === 'flower',
        this.citronBloomLod,
      );
      this.components.push(this.sideCurtainParticles);
    } else {
      this.fluidFlowerComponent = new FluidFlowerComponent();
      this.sections3DComponent = new Sections3DComponent();
      this.components.push(this.fluidFlowerComponent, this.sections3DComponent);
    }
  }

  private init(): void {
    this.camera.resize(this.renderer.viewport);

    if (this.postprocessing instanceof CitronBloomComposer) {
      if (this.bloomExperienceId === 'flower') {
        this.transitionSceneHandle = createBloomTransitionScene();
        this.postprocessing.init(
          this.renderer.instance,
          this.scene.instance,
          this.camera.instance,
          this.transitionSceneHandle.scene,
        );
      } else {
        this.postprocessing.init(
          this.renderer.instance,
          this.scene.instance,
          this.camera.instance,
        );
      }
    } else {
      this.postprocessing.init(this.renderer.instance);
    }

    /** Camera must live in the scene graph so children (e.g. side-curtain Points) are rendered. */
    this.scene.instance.add(this.camera.instance);

    for (const system of this.systems) {
      system.init(this.frameContext);
    }
    for (const component of this.components) {
      component.init(this.frameContext);
    }

    this.sideCurtainParticles?.setAudioSystem(this.audioSystem);

    if (this.useCitronBloom && this.citronBloomComponent) {
      this.animationSystem.setMode(this.citronBloomComponent.getCameraMode());
    }

    if (this.useCitronBloom && this.bloomExperienceId === 'flower') {
      this.journeyWeb = createJourneyWebScene(PORTFOLIO_PROJECTS, this.citronBloomLod);
      this.scene.instance.add(this.journeyWeb.root);
      initPortfolioChat();
    }

    if (this.useCitronBloom) {
      this.liquidRibbon = createPointerLiquidRibbon();
      this.scene.instance.add(this.liquidRibbon.group);
    }

    initNavChrome(this.audioSystem);
    initCookieConsent();

    registerPortfolioScrollNavigator((p) => this.scrollSystem.scrollToProgress(p));

    this.onResize();

    this.initStudioEnvironment();

    window.addEventListener('resize', this.onResize);
    this.renderer.instance.setAnimationLoop(this.tick);

    if (import.meta.env.DEV && this.useCitronBloom) {
      const self = this;
      const w = window as Window & {
        inkblotEngine?: {
          swapBloomExperience: (id: string) => boolean;
          readonly activeExperienceId: string;
        };
      };
      w.inkblotEngine = {
        swapBloomExperience(id: string) {
          return self.bloomSwap.startSwap(id);
        },
        get activeExperienceId() {
          return self.activeBloomExperienceId;
        },
      };
    }
  }

  private initStudioEnvironment(): void {
    const env = createStudioEnvironment(this.renderer.instance);
    this.scene.setEnvironment(env.texture);
    if (this.transitionSceneHandle) {
      this.transitionSceneHandle.scene.environment = env.texture;
    }
    bloomExperienceRegistry.getActive()?.setEnvMap?.(env.texture, 1.5);
    this.studioEnvironment = env;
  }

  private tick = (): void => {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    this.frameContext.delta = delta;
    this.frameContext.elapsed = elapsed;

    this.scrollSystem.update(this.frameContext);
    document.documentElement.style.setProperty(
      '--scroll-raw',
      String(this.scrollSystem.progress),
    );
    if (this.useCitronBloom) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) {
        document.documentElement.style.setProperty('--at-neon-flicker', '1');
        document.documentElement.style.setProperty('--at-neon-pulse', '0.45');
      } else {
        const flick =
          0.88 +
          Math.sin(elapsed * 2.85) * 0.05 +
          Math.sin(elapsed * 7.12 + 1.7) * 0.028 +
          Math.sin(elapsed * 13.4) * 0.014;
        document.documentElement.style.setProperty('--at-neon-flicker', flick.toFixed(4));
        document.documentElement.style.setProperty(
          '--at-neon-pulse',
          (0.42 + 0.08 * Math.sin(elapsed * 1.1)).toFixed(4),
        );
      }
    }
    this.interactionSystem.update(this.frameContext);
    this.animationSystem.setScrollProgress(this.scrollSystem.progress);
    if (this.useCitronBloom) {
      this.animationSystem.setPointerNdc(
        this.interactionSystem.pointer.x,
        this.interactionSystem.pointer.y,
      );
    }

    this.bloomSwap.update(delta, {
      setBlackout: (v) => {
        if (this.postprocessing instanceof CitronBloomComposer) {
          this.postprocessing.setExperienceBlackout(v);
        }
      },
      performSwap: (id) => {
        if (!this.citronBloomComponent) return;
        this.citronBloomComponent.activateExperience(id, this.frameContext);
        this.activeBloomExperienceId = this.citronBloomComponent.getExperienceId();
        this.animationSystem.setMode(this.citronBloomComponent.getCameraMode());
        document.body.classList.toggle('experience-stomp', this.activeBloomExperienceId === 'stomp');
        document.body.classList.toggle(
          'journey-flower-active',
          this.useCitronBloom && this.activeBloomExperienceId === 'flower',
        );
        this.camera.setDampFactor(this.activeBloomExperienceId === 'flower' ? 12.5 : 1.42);
        if (this.activeBloomExperienceId !== 'flower') {
          this.animationSystem.setJourneyFlower(null);
          this.prevJourneySection = null;
          this.journeyTransitionPulse = 0;
          this.camera.setWorldPositionMinY(null);
          syncJourneyFog(this.scene.instance, -1);
          if (this.journeyWeb) this.journeyWeb.root.visible = false;
          if (this.postprocessing instanceof CitronBloomComposer) {
            this.postprocessing.setSceneTransition(0, 0, 0, 0);
          }
          if (this.transitionSceneHandle) this.transitionSceneHandle.scene.visible = false;
        } else {
          if (this.journeyWeb) this.journeyWeb.root.visible = true;
          if (this.transitionSceneHandle) this.transitionSceneHandle.scene.visible = true;
        }
      },
    });

    if (this.useCitronBloom && this.activeBloomExperienceId === 'flower') {
      const journey = resolveJourney(this.scrollSystem.progress);
      document.documentElement.style.setProperty('--journey-section', String(journey.section));
      document.documentElement.style.setProperty('--journey-local', String(journey.localT));
      document.body.dataset.journeySection = String(journey.section);
      const stops = journeyCumulativeStops();
      const s0End = stops[1];
      const s1End = stops[2];
      const g = journey.globalT;

      if (this.prevJourneySection !== null && this.prevJourneySection !== journey.section) {
        this.journeyTransitionPulse = 1;
        document.body.classList.remove('journey-boundary-flash');
        void document.body.offsetWidth;
        document.body.classList.add('journey-boundary-flash');
        window.setTimeout(() => document.body.classList.remove('journey-boundary-flash'), 700);
      }
      this.prevJourneySection = journey.section;

      const edge = Math.min(journey.localT, 1 - journey.localT);
      document.documentElement.style.setProperty(
        '--journey-edge',
        String(Math.min(1, Math.pow(edge * 2.4, 1.15))),
      );

      let heroOpacity = 0;
      if (journey.section === 1) {
        const fadeIn = smoothstep(s0End + 0.004, s0End + 0.058, g);
        const fadeOut = 1 - smoothstep(s1End - 0.055, s1End + 0.04, g);
        heroOpacity = Math.min(fadeIn, fadeOut);
      }
      document.documentElement.style.setProperty('--journey-hero-ui', String(heroOpacity));

      const bloomCss =
        journey.section === 0
          ? bloomScrollDrive(journey.localT)
          : journey.section === 5
            ? bloomScrollDrive(1 - journey.localT)
            : 1;
      document.documentElement.style.setProperty('--bloom-scroll', String(bloomCss));

      this.animationSystem.setJourneyFlower({
        section: journey.section,
        localT: journey.localT,
      });
      syncJourneyFog(this.scene.instance, journey.section);

      if (this.journeyWeb) {
        this.journeyWeb.update({
          journey,
          renderer: this.renderer.instance,
          elapsed,
          delta,
          heroOpacity,
        });
      }

      const flowerRoot = bloomExperienceRegistry.getActive()?.root ?? null;
      if (flowerRoot) {
        if (journey.section === 0) {
          flowerRoot.visible = true;
          const fo = 1 - smoothstep(s0End - 0.125, s0End - 0.012, g);
          setMeshTreeOpacity(flowerRoot, fo);
        } else if (journey.section === 5) {
          flowerRoot.visible = true;
          setMeshTreeOpacity(flowerRoot, 1);
        } else {
          flowerRoot.visible = false;
        }
      }

      let drive = 1;
      if (journey.section === 0) drive = bloomScrollDrive(journey.localT);
      else if (journey.section === 5) drive = bloomScrollDrive(1 - journey.localT);
      this.citronBloomComponent?.applyBloomDrive(drive);

      const transitionFxFloor = computeJourneySectionTransitionFx(journey);
      const allowCameraBelowGround =
        journey.section === 5 ||
        transitionFxFloor > 0.14 ||
        this.journeyTransitionPulse > 0.32;
      this.camera.setWorldPositionMinY(
        allowCameraBelowGround
          ? null
          : FLOWER_GROUND_PLANE_WORLD_Y + FLOWER_CAMERA_CLEARANCE_ABOVE_GROUND,
      );

      if (this.transitionSceneHandle) {
        this.transitionSceneHandle.scene.visible = journey.section !== 1;
      }

      this.journeyTransitionPulse *= Math.exp(-delta * 1.45);
    } else if (this.useCitronBloom) {
      this.journeyTransitionPulse = 0;
      this.camera.setWorldPositionMinY(null);
      this.camera.setDampFactor(1.42);
      this.animationSystem.setJourneyFlower(null);
      document.documentElement.style.removeProperty('--journey-section');
      document.documentElement.style.removeProperty('--journey-local');
      document.documentElement.style.removeProperty('--journey-hero-ui');
      document.documentElement.style.removeProperty('--journey-edge');
      this.prevJourneySection = null;
      delete document.body.dataset.journeySection;
      syncJourneyFog(this.scene.instance, -1);
      this.citronBloomComponent?.setBloomFromScroll(this.scrollSystem.progress);
      document.documentElement.style.setProperty(
        '--bloom-scroll',
        String(this.scrollSystem.progress),
      );
    }

    this.animationSystem.update(this.frameContext);
    this.audioSystem.update(this.frameContext);
    updateNavChrome(this.audioSystem, this.scrollSystem, elapsed);

    if (
      this.citronBloomComponent &&
      this.scrollSystem &&
      !(this.useCitronBloom && this.activeBloomExperienceId === 'flower')
    ) {
      this.citronBloomComponent.setBloomFromScroll(this.scrollSystem.progress);
    }

    if (this.citronBloomComponent && this.useCitronBloom && this.activeBloomExperienceId === 'flower') {
      const j = resolveJourney(this.scrollSystem.progress);
      /**
       * scrollReveal: long ease near document top so a fast scroll-up doesn’t slam gate (and pollen) to 0.
       */
      const scrollReveal = smoothstep(0.0, 0.12, j.globalT);
      const sectionTail = j.section === 0 ? 1 - smoothstep(0.55, 0.94, j.localT) : 0;
      const gate01 = sectionTail * scrollReveal;
      /**
       * Drive pollen intensity on act-0 local progress [0,1], not full-page scroll.
       * Act 0 is only ~18% of global T — using global T kept opacity ramps near zero for the whole flower beat.
       */
      const pollenProgress01 = j.section === 0 ? j.localT : 0;
      this.citronBloomComponent.setPollenScrollDrive(gate01, pollenProgress01);
    } else if (this.citronBloomComponent) {
      this.citronBloomComponent.setPollenScrollDrive(0, 0);
    }

    for (const component of this.components) {
      component.update(this.frameContext);
    }

    if (this.sections3DComponent && this.scrollSystem) {
      this.sections3DComponent.setInteractionValues(this.scrollSystem.progress);
    }

    if (this.useCitronBloom && this.activeBloomExperienceId !== 'flower') {
      const p = this.scrollSystem.progress;
      document.documentElement.style.setProperty('--bloom-scroll', String(p));
    }

    if (this.fluidFlowerComponent && this.scrollSystem && this.audioSystem) {
      this.fluidFlowerComponent.setInteractionValues(
        this.scrollSystem.progress,
        this.audioSystem.lowFrequencyVolume,
      );
    }

    this.camera.update(delta);
    this.controls.update();
    this.citronBloomComponent?.syncEnvParticlesCamera(this.frameContext);
    if (this.useCitronBloom && this.activeBloomExperienceId === 'flower' && this.journeyWeb) {
      this.journeyWeb.syncEnvParticlesCamera(this.frameContext.camera);
    }

    if (
      this.transitionSceneHandle &&
      this.useCitronBloom &&
      this.activeBloomExperienceId === 'flower' &&
      this.transitionSceneHandle.scene.visible
    ) {
      this.transitionSceneHandle.update(elapsed, this.camera.instance);
    }

    if (this.postprocessing instanceof CitronBloomComposer && this.postprocessing.hasDualSceneBlend()) {
      let blend = 0;
      let transitionFx = 0;
      if (this.useCitronBloom && this.activeBloomExperienceId === 'flower') {
        const j = resolveJourney(this.scrollSystem.progress);
        blend = computeJourneyDualSceneBlend(j);
        transitionFx = computeJourneySectionTransitionFx(j);
      }
      this.postprocessing.setSceneTransition(blend, 0, 0, transitionFx);
    }

    if (this.postprocessing instanceof CitronBloomComposer) {
      let localT = 0;
      let pulse = this.journeyTransitionPulse;
      let style = 0;
      if (this.useCitronBloom && this.activeBloomExperienceId === 'flower') {
        const j = resolveJourney(this.scrollSystem.progress);
        style = resolveBloomJourneyVisualStyle('flower', j.section);
        localT = j.localT;
      } else if (this.useCitronBloom) {
        pulse = 0;
        style = resolveBloomJourneyVisualStyle(this.activeBloomExperienceId);
        localT = this.scrollSystem.progress;
      }
      this.postprocessing.setJourneyVisual({ style, localT, pulse, elapsed });
    }

    let shardJourneySection = -1;
    if (this.useCitronBloom && this.activeBloomExperienceId === 'flower') {
      shardJourneySection = resolveJourney(this.scrollSystem.progress).section;
    }

    this.liquidRibbon?.update({
      elapsed,
      delta,
      camera: this.camera.instance,
      pointerNdc: this.interactionSystem.rawPointer,
      pointerVelocityNdc: this.interactionSystem.pointerVelocityRaw,
      enabled: this.useCitronBloom,
      journeySection: shardJourneySection,
      scene: this.scene.instance,
    });

    this.postprocessing.render(
      this.renderer.instance,
      this.scene.instance,
      this.camera.instance,
      elapsed,
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

    clearPortfolioScrollNavigator();

    for (const component of this.components) component.dispose();
    for (const system of this.systems) system.dispose();

    this.journeyWeb?.root.removeFromParent();
    this.journeyWeb?.dispose();
    this.journeyWeb = null;

    this.transitionSceneHandle?.dispose();
    this.transitionSceneHandle = null;

    this.scene.instance.environment = null;
    this.studioEnvironment?.dispose();
    this.studioEnvironment = null;

    this.liquidRibbon?.dispose();
    this.liquidRibbon = null;

    this.camera.instance.removeFromParent();

    this.postprocessing.dispose();
    this.controls.dispose();
    this.scene.dispose();
    this.renderer.dispose();
  }
}

export function mountInkblot(container: HTMLElement): Inkblot {
  return new Inkblot(container);
}
