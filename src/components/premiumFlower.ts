import {
  InstancedMesh,
  InstancedBufferAttribute,
  ShaderMaterial,
  BoxGeometry,
  DoubleSide,
  Color,
  Object3D,
} from 'three';
import { premiumFlowerVert, premiumFlowerFrag } from '@/shaders';
import { PALETTE, COLORS } from '@/utils/colors';
import type { FrameContext, IComponent } from '@/types';

export class PremiumFlowerComponent implements IComponent {
  private mesh!: InstancedMesh;
  private material!: ShaderMaterial;
  
  // Total petals divided into 3 distinct layers
  private readonly petalCount = 120;

  init(ctx: FrameContext): void {
    // Volumetric geometry: a thin box instead of a plane to give physical weight
    // Subdivided heavily on Y to allow for smooth curling
    const geometry = new BoxGeometry(2, 6, 0.02, 16, 32, 1);
    // Shift origin so the pivot is at the base
    geometry.translate(0, 3.0, 0);

    this.material = new ShaderMaterial({
      vertexShader: premiumFlowerVert,
      fragmentShader: premiumFlowerFrag,
      uniforms: {
        uTime: { value: 0 },
        uScrollProgress: { value: 0 },
        uAudioLow: { value: 0 },
        uPrimaryColor: { value: COLORS.primary },
        uHoverColor: { value: COLORS.primaryHover },
        uAccentColor: { value: new Color(PALETTE.accent) },
      },
      side: DoubleSide,
      transparent: false, // Opaque for proper depth sorting and heavy volumetric look
      depthWrite: true,
    });

    this.mesh = new InstancedMesh(geometry, this.material, this.petalCount);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    const dummy = new Object3D();
    for (let i = 0; i < this.petalCount; i++) {
      dummy.position.set(0, 0, 0);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }

    // Instance attributes
    const angles = new Float32Array(this.petalCount);
    const radii = new Float32Array(this.petalCount);
    const pitches = new Float32Array(this.petalCount);
    const randoms = new Float32Array(this.petalCount);
    const layerIndices = new Float32Array(this.petalCount);

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    
    for (let i = 0; i < this.petalCount; i++) {
      // Determine layer (0 = core, 1 = inner, 2 = outer)
      const ratio = i / this.petalCount;
      let layer = 2; // Outer
      if (ratio < 0.3) layer = 0; // Core
      else if (ratio < 0.7) layer = 1; // Inner

      layerIndices[i] = layer;

      // Spiral arrangement
      angles[i] = i * goldenAngle;
      
      // Radius increases with index. Core is tight, outer is wide.
      radii[i] = Math.pow(ratio, 0.8) * 4.0;
      
      // Pitch: core stands straight up (0), outer lays flat (PI/2)
      pitches[i] = ratio * (Math.PI * 0.45);
      
      randoms[i] = Math.random();
    }

    geometry.setAttribute('aInstanceAngle', new InstancedBufferAttribute(angles, 1));
    geometry.setAttribute('aInstanceRadius', new InstancedBufferAttribute(radii, 1));
    geometry.setAttribute('aInstancePitch', new InstancedBufferAttribute(pitches, 1));
    geometry.setAttribute('aInstanceRandom', new InstancedBufferAttribute(randoms, 1));
    geometry.setAttribute('aLayerIndex', new InstancedBufferAttribute(layerIndices, 1));

    // Place at origin
    this.mesh.position.set(0, -1, 0);
    this.mesh.instanceMatrix.needsUpdate = true;
    ctx.scene.add(this.mesh);
  }

  update(ctx: FrameContext): void {
    if (!this.material) return;
    this.material.uniforms.uTime.value = ctx.elapsed;
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
