import type { Camera, Scene, WebGLRenderer } from 'three';
import { FogExp2, Group, Mesh, type Object3D } from 'three';
import type { BloomLod } from '@citron-bloom-engine/bloom-core/types';
import { createGlassLogoHero } from '@citron-bloom-engine/journey/createGlassLogoHero';
import { createPortfolioCarousel } from '@citron-bloom-engine/journey/createPortfolioCarousel';
import { createClientGallery } from '@citron-bloom-engine/journey/createClientGallery';
import { createLabPortalScene } from '@citron-bloom-engine/journey/createLabPortalScene';
import type { PortfolioProject } from '@/data/portfolioProjects';
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
  /** Lab + journey particle layers need the same camera shield / fade as the flower. */
  syncEnvParticlesCamera(camera: Camera): void;
  dispose(): void;
}

const journeyLabFog = new FogExp2(0x020814, 0.036);

export function createJourneyWebScene(
  projects: readonly PortfolioProject[],
  lod: BloomLod = 'high',
): JourneyWebSceneHandle {
  const root = new Group();
  root.name = 'journey-root';

  const hero = createGlassLogoHero();
  const portfolio = createPortfolioCarousel(projects);
  const gallery = createClientGallery(projects);
  const lab = createLabPortalScene({ lod });

  hero.group.name = 'journey-hero-logo';
  portfolio.group.name = 'journey-portfolio';
  gallery.group.name = 'journey-gallery';
  lab.group.name = 'journey-lab';

  root.add(hero.group, portfolio.group, gallery.group, lab.group);

  return {
    root,
    syncEnvParticlesCamera(camera: Camera) {
      lab.syncEnvCamera(camera);
    },
    update({ journey, renderer, elapsed, delta, heroOpacity }) {
      const { section, localT } = journey;

      hero.update(elapsed);
      if (section === 2) {
        portfolio.update(renderer, elapsed, localT * Math.PI * 0.85 + elapsed * 0.04);
      }
      if (section === 3) {
        gallery.update(elapsed, localT);
      }
      lab.update(delta, elapsed, localT);

      setMeshTreeOpacity(hero.group, heroOpacity);

      hero.group.visible = heroOpacity > 0.02;
      portfolio.group.visible = section === 2;
      gallery.group.visible = section === 3;
      lab.group.visible = section === 4;
    },
    dispose() {
      hero.dispose();
      portfolio.dispose();
      gallery.dispose();
      lab.dispose();
    },
  };
}

export function syncJourneyFog(scene: Scene, section: number): void {
  if (section === 4) {
    scene.fog = journeyLabFog;
  } else {
    scene.fog = null;
  }
}
