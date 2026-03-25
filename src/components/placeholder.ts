import {
  Mesh,
  SphereGeometry,
  MeshStandardMaterial,
  Group,
} from 'three';
import { PALETTE } from '@/utils/colors';
import type { FrameContext, IComponent } from '@/types';

/**
 * Debug placeholder — a cluster of floating spheres to validate
 * renderer, lighting, and postprocessing before real assets exist.
 *
 * Surface color: #0B1220 (PALETTE.surface)
 * Emissive tint: #2563EB (PALETTE.primary) at low intensity
 */
export class PlaceholderComponent implements IComponent {
  private group = new Group();
  private readonly count = 7;

  init(ctx: FrameContext): void {
    const geometry = new SphereGeometry(0.4, 32, 32);
    const material = new MeshStandardMaterial({
      color: PALETTE.surface,
      emissive: PALETTE.primary,
      emissiveIntensity: 0.15,
      roughness: 0.2,
      metalness: 0.8,
    });

    for (let i = 0; i < this.count; i++) {
      const mesh = new Mesh(geometry, material.clone());

      const angle = (i / this.count) * Math.PI * 2;
      const radius = 2.5 + Math.random() * 1.5;
      mesh.position.set(
        Math.cos(angle) * radius,
        Math.random() * 3 - 0.5,
        Math.sin(angle) * radius,
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }

    ctx.scene.add(this.group);
  }

  update(ctx: FrameContext): void {
    this.group.children.forEach((child, i) => {
      child.position.y += Math.sin(ctx.elapsed * 0.6 + i * 1.2) * 0.002;
      child.rotation.y += ctx.delta * 0.15;
    });
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.geometry.dispose();
        (obj.material as MeshStandardMaterial).dispose();
      }
    });
    this.group.removeFromParent();
  }
}
