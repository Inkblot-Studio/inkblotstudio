import { clamp, smootherstep } from '@/utils/math';
import {
  createCitronBloomScene,
  type CitronBloomSceneHandle,
} from '../examples/createCitronBloomScene';
import { FLOWER_EXPERIENCE_ROOT_Y } from './flowerStageConstants';
import type { BloomSceneFactoryContext, BloomExperienceScene } from './bloomExperienceTypes';

/** Same curve as flower bloom: soft at top of page, most change mid–scroll. */
export function bloomScrollDrive(scroll01: number): number {
  const s = clamp(scroll01, 0, 1);
  return Math.pow(s, 2.65);
}

function phasesFromDrive(drive: number): { main: number; branch: number; bud: number } {
  const d = clamp(drive, 0, 1);
  const open = smootherstep(0.06, 0.98, d);
  const main = Math.pow(open, 0.78);
  const branch = Math.pow(smootherstep(0.1, 0.98, d), 0.6);
  const bud = Math.pow(smootherstep(0.04, 0.96, d), 0.64);
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
    setPointerWorld(x: number, z: number) {
      handle.setPointerWorld?.(x, z);
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
