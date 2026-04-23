import type { Camera, Scene } from 'three';
import { FogExp2, Group, Mesh, type Object3D } from 'three';
import type { WebGLRenderer } from 'three';
import type { JourneyState } from './sectionMap';

export function setMeshTreeOpacity(root: Object3D, opacity: number): void {
  root.traverse((o) => {
    if (!(o instanceof Mesh) || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (m && typeof m === 'object' && 'opacity' in m && 'transparent' in m) {
        const mat = m as { opacity: number; transparent: boolean };
        mat.transparent = opacity < 0.998;
        mat.opacity = opacity;
      }
    }
  });
}

export interface JourneyWebSceneHandle {
  readonly root: Group;
  update(params: {
    journey: JourneyState;
    renderer: WebGLRenderer;
    elapsed: number;
    delta: number;
    heroOpacity: number;
  }): void;
  syncEnvParticlesCamera(camera: Camera): void;
  dispose(): void;
}

const flowerPoolAtmosphereFog = new FogExp2(0x061820, 0.024);
const workMistFog = new FogExp2(0x050a12, 0.02);

/**
 * No glass hero or portfolio carousel — flower experience + fixed UI only.
 */
export function createJourneyWebScene(): JourneyWebSceneHandle {
  const root = new Group();
  root.name = 'journey-root';
  return {
    root,
    syncEnvParticlesCamera() {},
    update() {},
    dispose() {},
  };
}

export function syncJourneyFog(scene: Scene, section: number): void {
  if (section === 0) {
    scene.fog = flowerPoolAtmosphereFog;
  } else {
    scene.fog = workMistFog;
  }
}
