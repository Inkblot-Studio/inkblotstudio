import { FogExp2, Group } from 'three';
import { createParticleInterior } from '../particle-interior/createParticleInterior';
import { createParticleFlow } from '../particle-flow/createParticleFlow';
import type { BloomExperienceScene, BloomSceneFactoryContext } from '../../bloom-runtime/bloomExperienceTypes';

const fog = new FogExp2(0x040612, 0.048);

export function createParticleInteriorDemoExperience(ctx: BloomSceneFactoryContext): BloomExperienceScene {
  const interior = createParticleInterior({
    lod: ctx.lod,
    particleBudget: ctx.lod === 'low' ? 3200 : ctx.lod === 'medium' ? 4500 : 5600,
    columns: ctx.lod === 'low' ? 6 : 8,
  });

  const flow = createParticleFlow({
    lod: ctx.lod,
    particleBudget: ctx.lod === 'low' ? 2200 : ctx.lod === 'medium' ? 3800 : 4800,
    turns: 3.6,
    radius: 1.15,
    height: 2.2,
    flowStrength: 1.45,
  });

  flow.group.position.set(0, 0.85, 0);
  flow.group.scale.setScalar(1.15);

  const root = new Group();
  root.name = 'particle-interior-demo';
  root.add(interior.group, flow.group);

  ctx.scene.fog = fog;

  return {
    id: 'particleinterior',
    root,
    cameraMode: 'showcaseOrbit',
    update(delta: number, elapsed: number) {
      interior.update(delta, elapsed);
      flow.update(delta, elapsed);
    },
    syncEnvCamera(camera) {
      interior.syncEnvCamera?.(camera);
      flow.syncEnvCamera?.(camera);
    },
    dispose() {
      interior.dispose();
      flow.dispose();
      root.removeFromParent();
      ctx.scene.fog = null;
    },
  };
}
