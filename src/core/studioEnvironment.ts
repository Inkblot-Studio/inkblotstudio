import { Mesh, PMREMGenerator, type Texture, WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface StudioEnvironmentHandle {
  readonly texture: Texture;
  dispose(): void;
}

/**
 * Bakes a neutral studio IBL from Three's RoomEnvironment for MeshPhysicalMaterial
 * transmission, reflections, and clearcoat. Dispose when the renderer/scene shuts down.
 */
export function createStudioEnvironment(
  renderer: WebGLRenderer,
): StudioEnvironmentHandle {
  const pmremGenerator = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const renderTarget = pmremGenerator.fromScene(room, 0.04);

  room.traverse((child) => {
    if (child instanceof Mesh) {
      child.geometry.dispose();
      const m = child.material;
      if (Array.isArray(m)) m.forEach((mat) => mat.dispose());
      else m.dispose();
    }
  });

  pmremGenerator.dispose();

  return {
    texture: renderTarget.texture,
    dispose() {
      renderTarget.dispose();
    },
  };
}
