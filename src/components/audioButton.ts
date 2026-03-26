import {
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Color,
} from 'three';
import { audioButtonVert, audioButtonFrag } from '@/shaders';
import { PALETTE, COLORS } from '@/utils/colors';
import type { FrameContext, IComponent } from '@/types';
import type { AudioSystem } from '@/systems/audioSystem';
import type { InteractionSystem } from '@/systems/interactionSystem';

export class AudioButtonComponent implements IComponent {
  public mesh!: Mesh;
  private material!: ShaderMaterial;
  private audioSys: AudioSystem | null = null;
  private interactionSys: InteractionSystem | null = null;

  init(ctx: FrameContext): void {
    // 2D plane for the button
    const geometry = new PlaneGeometry(1, 1);

    this.material = new ShaderMaterial({
      vertexShader: audioButtonVert,
      fragmentShader: audioButtonFrag,
      uniforms: {
        uTime: { value: 0 },
        uIsPlaying: { value: 0 },
        uAudioHigh: { value: 0 },
        uPrimaryColor: { value: COLORS.primary },
        uHoverColor: { value: COLORS.primaryHover },
        uAccentColor: { value: new Color(PALETTE.accent) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this.mesh = new Mesh(geometry, this.material);
    
    // HUD setup usually places this in a specific corner. 
    // We will let the main.ts manage the Orthographic layout, 
    // but default it near bottom right.
    this.mesh.position.set(0, 0, 0);

    ctx.scene.add(this.mesh);
  }

  setSystems(audioSys: AudioSystem, interactionSys: InteractionSystem) {
    this.audioSys = audioSys;
    this.interactionSys = interactionSys;
  }

  update(ctx: FrameContext): void {
    if (!this.material || !this.audioSys) return;
    
    this.material.uniforms.uTime.value = ctx.elapsed;
    this.material.uniforms.uIsPlaying.value = this.audioSys.isPlaying ? 1.0 : 0.0;
    this.material.uniforms.uAudioHigh.value = this.audioSys.highFrequencyVolume;

    // We do NOT handle clicking here, main.ts will handle Raycasting the HUD scene and calling audioSys.toggleAudio()
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.material.dispose();
      this.mesh.removeFromParent();
    }
  }
}
