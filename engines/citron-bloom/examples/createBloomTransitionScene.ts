import {
  AmbientLight,
  Color,
  FogExp2,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
} from 'three';
import type { Camera } from 'three';
import ibmPlexMonoFontUrl from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff?url';
import { Text } from 'troika-three-text';
import { createGlassMaterial } from '../bloom-core/glassMaterialFactory';
import { createCinematicLighting } from '../bloom-core/sceneLighting';

export interface BloomTransitionSceneHandle {
  readonly scene: Scene;
  update(elapsed: number, camera: Camera): void;
  dispose(): void;
}

type TroikaText = Text & { anchorX?: string; anchorY?: string; maxWidth?: number };

function makeLabel(
  text: string,
  size: number,
  color: number,
  anchorX: 'left' | 'center' = 'left',
): TroikaText {
  const t = new Text() as TroikaText;
  t.text = text;
  t.fontSize = size;
  t.color = color;
  t.anchorX = anchorX;
  t.anchorY = 'top';
  t.font = ibmPlexMonoFontUrl;
  t.material = new MeshBasicMaterial({
    color,
    transparent: true,
  });
  t.sync();
  return t;
}

/**
 * Secondary journey scene: fog, cinematic lights, glass work card, and menu copy.
 * (Floor plane and crystal spine removed — they leaked into the flower act via dual-scene blend.)
 * Pairs with {@link CitronBloomComposer} dual-scene blend on scroll.
 */
export function createBloomTransitionScene(): BloomTransitionSceneHandle {
  const scene = new Scene();
  scene.background = new Color(0x03050c);
  scene.fog = new FogExp2(0x050812, 0.016);

  const ambient = new AmbientLight(0x6a5acd, 0.28);
  scene.add(ambient);

  const lighting = createCinematicLighting('transition');
  scene.add(lighting.key, lighting.fill, lighting.rim);

  /* --- Floating glass “work” card --- */
  const cardGroup = new Group();
  cardGroup.position.set(1.35, 0.42, -0.35);
  cardGroup.rotation.set(-0.07, 0.38, 0.04);

  const cardBack = new Mesh(
    new PlaneGeometry(3.9, 2.08),
    new MeshBasicMaterial({
      color: 0x031510,
      transparent: true,
      opacity: 0.55,
    }),
  );
  cardBack.position.z = -0.02;
  cardGroup.add(cardBack);

  const glass = new Mesh(
    new PlaneGeometry(3.85, 2.02),
    createGlassMaterial('slab-glass', {
      color: new Color(0x0c5c40),
      transmission: 0.9,
      thickness: 0.42,
      emissive: new Color(0x062818),
      emissiveIntensity: 0.35,
      attenuationColor: new Color(0x0a3d28),
      attenuationDistance: 1.2,
    }),
  );
  cardGroup.add(glass);

  const cardTitle = makeLabel('INKBLOT | STUDIO WORK', 0.11, 0xe2f5ec);
  cardTitle.anchorX = 'center';
  cardTitle.position.set(0, 0.08, 0.06);
  cardTitle.maxWidth = 3.4;
  cardGroup.add(cardTitle);

  const cardSub = makeLabel('Realtime · Product · Research', 0.056, 0x7dd3b0);
  cardSub.anchorX = 'center';
  cardSub.position.set(0, -0.12, 0.065);
  cardSub.maxWidth = 3.2;
  cardGroup.add(cardSub);

  scene.add(cardGroup);

  /* --- Left menu stack (billboarded) --- */
  const menuRoot = new Group();
  menuRoot.position.set(-2.85, 0.55, 0.15);

  const menuHeader = makeLabel('WHAT ARE YOU LOOKING FOR?', 0.068, 0xf1f5f9);
  menuHeader.position.set(0, 0, 0);
  menuRoot.add(menuHeader);

  const menuBody = makeLabel(
    '-> WEBSITES\n-> INSTALLATIONS\n-> XR / VR / AI\n-> REALTIME 3D\n-> TOOLS & PIPELINES',
    0.055,
    0x94a3b8,
  );
  menuBody.position.set(0, -0.22, 0);
  menuBody.lineHeight = 1.55;
  menuBody.maxWidth = 4.2;
  menuRoot.add(menuBody);

  scene.add(menuRoot);

  return {
    scene,

    update(elapsed: number, camera: Camera) {
      cardGroup.position.y = 0.42 + Math.sin(elapsed * 0.62) * 0.045;
      cardGroup.rotation.z = 0.04 + Math.sin(elapsed * 0.35) * 0.018;

      menuRoot.quaternion.copy(camera.quaternion);

      lighting.update(elapsed);

      cardTitle.sync();
      cardSub.sync();
      menuHeader.sync();
      menuBody.sync();
    },

    dispose() {
      cardTitle.dispose();
      cardSub.dispose();
      menuHeader.dispose();
      menuBody.dispose();

      lighting.dispose();

      cardBack.geometry.dispose();
      (cardBack.material as MeshBasicMaterial).dispose();
      glass.geometry.dispose();
      glass.material.dispose();
    },
  };
}
