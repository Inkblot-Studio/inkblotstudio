import { Group, MeshStandardMaterial, Color } from 'three';
import { Text } from 'troika-three-text';
import { damp } from '@/utils/math';
import { PALETTE, COLORS } from '@/utils/colors';
import type { FrameContext, IComponent } from '@/types';

interface SectionConfig {
  title: string;
  body: string;
  position: [number, number, number];
  rotationY: number;
  triggerRange: [number, number]; // scroll progress start/end for full visibility
}

export class Sections3DComponent implements IComponent {
  private group = new Group();
  private sections: { container: Group; textGroup: Group; triggerRange: [number, number]; targetOpacity: number }[] = [];
  
  private scrollProgress = 0;

  // Orbit radius
  private readonly radius = 4.5;

  init(ctx: FrameContext): void {
    const configs: SectionConfig[] = [
      {
        title: 'ENGINEERING\nMOMENTUM',
        body: 'Inkblot Studio is a premier AI company dedicated to moving the needle for every industry.\nWe redefine how businesses operate with proprietary frameworks.',
        position: [
          Math.sin(0) * this.radius,
          0.5,
          Math.cos(0) * this.radius
        ],
        rotationY: 0,
        triggerRange: [0.1, 0.3],
      },
      {
        title: 'R&D LABS',
        body: 'Our research department develops AI and robotics solutions\nthat push boundaries and inform our flagship products.',
        position: [
          Math.sin(Math.PI * 0.4) * this.radius,
          -0.5,
          Math.cos(Math.PI * 0.4) * this.radius
        ],
        rotationY: Math.PI * 0.4,
        triggerRange: [0.3, 0.5],
      },
      {
        title: 'PROPRIETARY\nPRODUCTS',
        body: 'Meet Citron — our flagship internal framework\nsetting new benchmarks in autonomous data processing.',
        position: [
          Math.sin(Math.PI * 0.8) * this.radius,
          0.8,
          Math.cos(Math.PI * 0.8) * this.radius
        ],
        rotationY: Math.PI * 0.8,
        triggerRange: [0.5, 0.7],
      },
      {
        title: 'THE MINDS BEHIND\nTHE MACHINE',
        body: 'Bridging the gap between academic theory and\nproduction-grade engineering for real-world impact.',
        position: [
          Math.sin(Math.PI * 1.2) * this.radius,
          -0.2,
          Math.cos(Math.PI * 1.2) * this.radius
        ],
        rotationY: Math.PI * 1.2,
        triggerRange: [0.7, 0.9],
      }
    ];

    for (const conf of configs) {
      const container = new Group();
      container.position.set(...conf.position);
      // We want the text to face the camera, but roughly rotate outwards from the center.
      // So rotationY is the angle + PI so it faces out.
      container.rotation.y = conf.rotationY + Math.PI;

      const titleMesh = new Text();
      titleMesh.text = conf.title;
      // titleMesh.font = 'https://fonts.gstatic.com/s/cinzel/v19/8vIX7kw6OSWKfITRGYs.woff'; // Cinzel regular
      titleMesh.fontSize = 0.5;
      titleMesh.position.y = 0.8;
      titleMesh.color = COLORS.primaryHover;
      titleMesh.material = new MeshStandardMaterial({
        color: COLORS.primaryHover,
        emissive: COLORS.primaryHover,
        emissiveIntensity: 0.8,
        roughness: 0.1,
        transparent: true,
        opacity: 0,
      });

      const bodyMesh = new Text();
      bodyMesh.text = conf.body;
      // bodyMesh.font = 'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2'; // Montserrat regular
      bodyMesh.fontSize = 0.15;
      bodyMesh.position.y = 0.0;
      bodyMesh.lineHeight = 1.6;
      bodyMesh.color = 0xffffff;
      bodyMesh.material = new MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
      });

      titleMesh.sync();
      bodyMesh.sync();

      const textGroup = new Group();
      textGroup.add(titleMesh);
      textGroup.add(bodyMesh);

      // Start text lower down for floating reveal
      textGroup.position.y = -1.0;

      container.add(textGroup);
      this.group.add(container);

      this.sections.push({
        container,
        textGroup,
        triggerRange: conf.triggerRange,
        targetOpacity: 0
      });
    }

    ctx.scene.add(this.group);
  }

  setInteractionValues(scrollProgress: number): void {
    this.scrollProgress = scrollProgress;
  }

  update(ctx: FrameContext): void {
    for (const section of this.sections) {
      const [start, end] = section.triggerRange;
      const center = (start + end) / 2;
      const range = (end - start) / 2;
      
      // Calculate distance from center of range
      const dist = Math.abs(this.scrollProgress - center);
      
      if (dist < range) {
        section.targetOpacity = 1.0;
      } else if (dist < range + 0.1) {
        // Fade in/out zone
        section.targetOpacity = 1.0 - ((dist - range) / 0.1);
      } else {
        section.targetOpacity = 0.0;
      }

      // Animate text elements (Opacities & Y position float)
      section.textGroup.children.forEach(child => {
        if ((child as any).material) {
          const mat = (child as any).material;
          mat.opacity = damp(mat.opacity, section.targetOpacity, 8, ctx.delta);
        }
      });

      // Float upwards as it appears
      const targetY = section.targetOpacity > 0.1 ? 0 : -1.0;
      section.textGroup.position.y = damp(section.textGroup.position.y, targetY, 4, ctx.delta);
    }
  }

  dispose(): void {
    this.sections.forEach(s => {
      s.textGroup.children.forEach(c => {
        if ((c as any).dispose) (c as any).dispose();
      });
    });
    this.group.removeFromParent();
  }
}
