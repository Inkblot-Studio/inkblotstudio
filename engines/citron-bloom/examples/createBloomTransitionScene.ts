import {
  AmbientLight,
  Color,
  DoubleSide,
  FogExp2,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  PointLight,
  Scene,
} from 'three';
import type { Camera } from 'three';
import { Text } from 'troika-three-text';

const IBM_PLEX_MONO =
  'https://fonts.gstatic.com/s/ibmplexmono/v19/jMAS9GvGsKxCA-WtwUKzsL_jdstr.woff2';

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
  t.font = IBM_PLEX_MONO;
  t.material = new MeshBasicMaterial({
    color,
    transparent: true,
  });
  t.sync();
  return t;
}

/**
 * “Second act” after the flower: iridescent spine, spectrum dust, glass work card,
 * and monospaced menu copy — Active Theory–style depth and atmosphere.
 * Pairs with {@link CitronBloomComposer} dual-scene blend on scroll.
 */
export function createBloomTransitionScene(): BloomTransitionSceneHandle {
  const scene = new Scene();
  scene.background = new Color(0x03050c);
  scene.fog = new FogExp2(0x050812, 0.016);

  const ambient = new AmbientLight(0x6a5acd, 0.28);
  scene.add(ambient);

  const key = new PointLight(0x9966ff, 1.35, 28, 1.8);
  key.position.set(2.8, 3.2, 4.2);
  scene.add(key);

  const teal = new PointLight(0x22d3ee, 1.05, 22, 1.6);
  teal.position.set(-3.5, 1.2, 2.4);
  scene.add(teal);

  const rim = new PointLight(0xff66cc, 0.55, 16, 1.4);
  rim.position.set(0, -0.8, -2.2);
  scene.add(rim);

  const floor = new Mesh(
    new PlaneGeometry(120, 120, 1, 1),
    new MeshStandardMaterial({
      color: 0x040812,
      roughness: 0.98,
      metalness: 0,
      emissive: new Color(0x0a1528),
      emissiveIntensity: 0.12,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.55;
  scene.add(floor);

  /* --- Iridescent crystal spine --- */
  const spine = new Group();
  const shardGeo = new OctahedronGeometry(0.13, 0);
  let seed = 9.017;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 36; i++) {
    const t = i / 35;
    const mat = new MeshPhysicalMaterial({
      color: new Color().setHSL(0.72 + t * 0.14 + (rnd() - 0.5) * 0.04, 0.62, 0.48),
      metalness: 0.9,
      roughness: MathUtils.lerp(0.12, 0.28, t),
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
      iridescence: 1,
      iridescenceIOR: 1.32,
      iridescenceThicknessRange: [100, 420],
      emissive: new Color().setHSL(0.78, 0.5, 0.25),
      emissiveIntensity: MathUtils.lerp(0.28, 0.08, t) * (0.85 + rnd() * 0.3),
    });
    const mesh = new Mesh(shardGeo, mat);
    const spread = 0.32;
    mesh.position.set(
      (rnd() - 0.5) * spread,
      t * 3.1 - 1.05,
      (rnd() - 0.5) * spread,
    );
    mesh.rotation.set(rnd() * Math.PI * 2, rnd() * Math.PI * 2, rnd() * Math.PI * 2);
    mesh.scale.setScalar(0.55 + rnd() * 1.1);
    spine.add(mesh);
  }
  scene.add(spine);

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
    new MeshPhysicalMaterial({
      color: 0x0c5c40,
      metalness: 0.06,
      roughness: 0.14,
      transmission: 0.9,
      thickness: 0.42,
      ior: 1.47,
      transparent: true,
      side: DoubleSide,
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

  const baseKey = key.intensity;
  const baseTeal = teal.intensity;
  const baseRim = rim.intensity;

  return {
    scene,

    update(elapsed: number, camera: Camera) {
      spine.rotation.y = elapsed * 0.065;

      cardGroup.position.y = 0.42 + Math.sin(elapsed * 0.62) * 0.045;
      cardGroup.rotation.z = 0.04 + Math.sin(elapsed * 0.35) * 0.018;

      menuRoot.quaternion.copy(camera.quaternion);

      key.intensity = baseKey + Math.sin(elapsed * 1.05) * 0.22;
      teal.intensity = baseTeal + Math.sin(elapsed * 0.88 + 1.2) * 0.18;
      rim.intensity = baseRim + Math.sin(elapsed * 1.4) * 0.12;

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

      spine.traverse((obj) => {
        const m = obj as Mesh;
        if (m.isMesh) {
          (m.material as MeshPhysicalMaterial).dispose?.();
        }
      });
      shardGeo.dispose();

      floor.geometry.dispose();
      (floor.material as MeshStandardMaterial).dispose();

      cardBack.geometry.dispose();
      (cardBack.material as MeshBasicMaterial).dispose();
      glass.geometry.dispose();
      (glass.material as MeshPhysicalMaterial).dispose();
    },
  };
}
