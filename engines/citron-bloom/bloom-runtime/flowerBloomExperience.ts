import { clamp, smootherstep } from '../bloom-core/math';
import {
  createCitronBloomScene,
  type CitronBloomSceneHandle,
} from '../examples/createCitronBloomScene';
import { FLOWER_EXPERIENCE_ROOT_Y } from './flowerStageConstants';
import type { BloomSceneFactoryContext, BloomExperienceScene } from './bloomExperienceTypes';

/** Same curve as flower bloom: soft at top of page, most change mid–scroll. */
export function bloomScrollDrive(scroll01: number): number {
  const s = clamp(scroll01, 0, 1);
  // Slightly gentler than 2.65 — more resolution in the “almost open” band.
  return Math.pow(s, 2.38);
}

function phasesFromDrive(drive: number): { main: number; branch: number; bud: number } {
  const d = clamp(drive, 0, 1);
  const open = smootherstep(0.035, 0.995, d);
  const main = Math.pow(open, 0.82);
  const branch = Math.pow(smootherstep(0.09, 0.992, d), 0.58);
  const bud = Math.pow(smootherstep(0.02, 0.975, d), 0.62);
  return { main, branch, bud };
}

function wrapFlowerHandle(handle: CitronBloomSceneHandle): BloomExperienceScene {
  return {
    id: 'flower',
    root: handle.root,
    cameraMode: 'delicate',
    update(delta: number, elapsed: number) {
      handle.update(delta, elapsed);
    },
    setPointerWorld(x: number, z: number, delta?: number, pointerVelocity?: number) {
      handle.setPointerWorld?.(x, z, delta, pointerVelocity);
    },
    syncEnvCamera(camera) {
      handle.syncEnvCamera?.(camera);
    },
    dispose() {
      handle.dispose();
    },
    setBloomFromScroll(scroll01: number) {
      const s = clamp(scroll01, 0, 1);
      const { main, branch, bud } = phasesFromDrive(bloomScrollDrive(s));
      handle.setBloomTarget(main, branch, bud);
    },
    applyBloomDrive(drive01: number) {
      const { main, branch, bud } = phasesFromDrive(drive01);
      handle.setBloomTarget(main, branch, bud);
    },
  };
}

export function createFlowerBloomExperience(ctx: BloomSceneFactoryContext): BloomExperienceScene {
  const handle = createCitronBloomScene({ lod: ctx.lod });
  handle.root.position.set(0, FLOWER_EXPERIENCE_ROOT_Y, 0);
  return wrapFlowerHandle(handle);
}
