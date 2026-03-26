import { FogExp2 } from 'three';
import { createParticleForest } from '../particle-forest/createParticleForest';
import type { BloomExperienceScene, BloomSceneFactoryContext } from '../../bloom-runtime/bloomExperienceTypes';

const fog = new FogExp2(0x050816, 0.042);

export function createParticleForestDemoExperience(ctx: BloomSceneFactoryContext): BloomExperienceScene {
  const env = createParticleForest({
    lod: ctx.lod,
    treeCount: ctx.lod === 'low' ? 6 : ctx.lod === 'medium' ? 8 : 10,
    particleBudgetPerTree: ctx.lod === 'low' ? 900 : ctx.lod === 'medium' ? 1200 : 1500,
    innerRadius: 1.65,
    radius: 6.5,
    seed: 7,
  });

  env.group.position.set(0, -0.2, 0);

  ctx.scene.fog = fog;

  return {
    id: 'particleforest',
    root: env.group,
    cameraMode: 'showcaseOrbit',
    update(delta: number, elapsed: number) {
      env.update(delta, elapsed);
    },
    setPointerWorld(x: number, z: number) {
      env.setPointerNdc?.(x, z);
    },
    syncEnvCamera(camera) {
      env.syncEnvCamera?.(camera);
    },
    dispose() {
      env.dispose();
      ctx.scene.fog = null;
    },
  };
}
