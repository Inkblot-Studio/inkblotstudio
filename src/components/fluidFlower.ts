import {
  Mesh,
  BoxGeometry,
  ShaderMaterial,
  Color,
  FrontSide,
} from 'three';
import { fluidFlowerVert, fluidFlowerFrag } from '@/shaders';
import { PALETTE, COLORS } from '@/utils/colors';
import type { FrameContext, IComponent } from '@/types';

export class FluidFlowerComponent implements IComponent {
  private mesh!: Mesh;
  private material!: ShaderMaterial;

  init(ctx: FrameContext): void {
    // We use a large bounding box. The raymarcher runs inside this volume.
    const geometry = new BoxGeometry(8, 8, 8);

    this.material = new ShaderMaterial({
      vertexShader: fluidFlowerVert,
      fragmentShader: fluidFlowerFrag,
      uniforms: {
        uTime: { value: 0 },
        uScrollProgress: { value: 0 },
        uAudioLow: { value: 0 },
        uPrimaryColor: { value: COLORS.primary },
        uHoverColor: { value: COLORS.primaryHover },
        uAccentColor: { value: new Color(PALETTE.accent) },
        cameraPosition: { value: ctx.camera.position }
      },
      side: FrontSide, // Render the front faces of the bounding box
      transparent: true, // Need transparent true so 'discard' works correctly with depth
      depthWrite: true,
    });

    this.mesh = new Mesh(geometry, this.material);
    
    ctx.scene.add(this.mesh);
  }

  update(ctx: FrameContext): void {
    if (!this.material) return;
    this.material.uniforms.uTime.value = ctx.elapsed;
    this.material.uniforms.cameraPosition.value.copy(ctx.camera.position);
  }

  setInteractionValues(scrollProgress: number, audioLow: number): void {
    if (this.material) {
      this.material.uniforms.uScrollProgress.value = scrollProgress;
      this.material.uniforms.uAudioLow.value = audioLow;
    }
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.material.dispose();
      this.mesh.removeFromParent();
    }
  }
}
