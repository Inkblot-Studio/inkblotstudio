import { PerspectiveCamera, Scene } from 'three';
import type { Vector2 } from 'three';
import type { BloomLod } from '../bloom-core/types';
import { CitronBloomComposer } from '../bloom-postprocess/citronBloomComposer';
import { citronBloomComposerOptionsForLod } from './bloomComposerPresets';
import { CitronBloomEngineHost } from './citronBloomEngineHost';
import type { BloomFrameContext } from './bloomFrameContext';
import { createBloomWebGLRenderer, resizeBloomRendererToContainer } from './createBloomWebGLRenderer';
import { transmissionResolutionScaleForBloomLod } from './bloomLodGpu';

export interface CreateCitronBloomShellOptions {
  container: HTMLElement;
  lod?: BloomLod;
  experienceId?: string;
  maxPixelRatio?: number;
  antialias?: boolean;
  /** Optional dual-scene flower transition (see {@link CitronBloomComposer.init}). */
  secondaryScene?: Scene;
  enableGroundPointer?: boolean;
}

/**
 * Minimal **standalone** Citron Bloom stack: renderer + scene + camera + composer + engine host.
 * Embedders drive `frame()` each animation tick and call `resize()` on window resize.
 *
 * For full Inkblot (scroll journey, glass shards, studio env), use {@link CitronBloomEngineHost}
 * inside your own scene instead.
 */
export interface CitronBloomShell {
  readonly renderer: ReturnType<typeof createBloomWebGLRenderer>;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly composer: CitronBloomComposer;
  readonly host: CitronBloomEngineHost;
  resize(): void;
  /**
   * @param pointerNdc — optional; when set, forwards to ground-pointer path on the active experience.
   */
  frame(ctx: Omit<BloomFrameContext, 'renderer' | 'scene' | 'camera'> & { pointerNdc?: Vector2; pointerVelocity?: number }): void;
  render(elapsed: number): void;
  dispose(): void;
}

export function createCitronBloomShell(options: CreateCitronBloomShellOptions): CitronBloomShell {
  const lod = options.lod ?? 'high';
  const experienceId = options.experienceId ?? 'flower';

  const renderer = createBloomWebGLRenderer({
    container: options.container,
    antialias: options.antialias,
    maxPixelRatio: options.maxPixelRatio,
    transmissionResolutionScale: transmissionResolutionScaleForBloomLod(lod),
  });

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, 3, 12);
  camera.lookAt(0, 0, 0);

  const composer = new CitronBloomComposer(citronBloomComposerOptionsForLod(lod));
  composer.init(renderer, scene, camera, options.secondaryScene);

  const host = CitronBloomEngineHost.fromOptions({
    lod,
    initialExperienceId: experienceId,
    enableGroundPointer: options.enableGroundPointer ?? true,
  });

  const bloomCtx: BloomFrameContext = {
    renderer,
    scene,
    camera,
    delta: 0,
    elapsed: 0,
  };
  host.init(bloomCtx);

  return {
    renderer,
    scene,
    camera,
    composer,
    host,
    resize() {
      resizeBloomRendererToContainer(renderer);
      const { width, height } = options.container.getBoundingClientRect();
      const pr = renderer.getPixelRatio();
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      composer.resize(width, height, pr);
    },
    frame(ctx) {
      bloomCtx.delta = ctx.delta;
      bloomCtx.elapsed = ctx.elapsed;
      if (ctx.pointerNdc) {
        host.updateWithInteraction(bloomCtx, ctx.pointerNdc, ctx.pointerVelocity ?? 0);
      } else {
        host.update(bloomCtx);
      }
    },
    render(elapsed) {
      composer.render(renderer, scene, camera, elapsed);
    },
    dispose() {
      host.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
