import {
  CanvasTexture,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
  VideoTexture,
} from 'three';
import type { WebGLRenderer } from 'three';
import { Text } from 'troika-three-text';
import { createGlassMaterial } from '../bloom-core/glassMaterialFactory';
import { createCinematicLighting } from '../bloom-core/sceneLighting';
import { deferVideoSource } from '../bloom-showcase/deferVideoSource';

export interface ClientGalleryProject {
  readonly title: string;
  readonly subtitle?: string;
  readonly videoSrc?: string;
  readonly imageSrc?: string;
}

export interface ClientGalleryHandle {
  readonly group: Group;
  update(elapsed: number, localT: number): void;
  dispose(): void;
}

type TroikaText = Text & { anchorX: string; anchorY: string; maxWidth: number };

function drawFallbackFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsed: number,
  title: string,
): void {
  const hue = (elapsed * 12 + title.length * 9) % 360;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsla(${hue}, 55%, 28%, 1)`);
  g.addColorStop(0.5, `hsla(${(hue + 60) % 360}, 50%, 18%, 1)`);
  g.addColorStop(1, `hsla(${(hue + 180) % 360}, 48%, 24%, 1)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#d0e8ff';
  for (let i = 0; i < 32; i++) {
    const x = (Math.sin(elapsed * 0.5 + i * 0.35) * 0.5 + 0.5) * w;
    const y = (Math.cos(elapsed * 0.38 + i * 0.22) * 0.5 + 0.5) * h;
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

interface SlabData {
  group: Group;
  video: HTMLVideoElement | null;
  fallback: { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement; tex: CanvasTexture } | null;
  title: TroikaText;
  subtitle: TroikaText | null;
  mat: MeshBasicMaterial;
}

const SLAB_W = 4.8;
const SLAB_H = 2.8;

function createDetailSlab(project: ClientGalleryProject): SlabData {
  const group = new Group();

  const glassMat = createGlassMaterial('slab-glass', {
    transmission: 0.72,
    thickness: 0.35,
  });
  const frame = new Mesh(new PlaneGeometry(SLAB_W, SLAB_H), glassMat);
  frame.renderOrder = 1;
  group.add(frame);

  const backMat = createGlassMaterial('slab-glass', {
    transmission: 0.55,
    roughness: 0.12,
    emissiveIntensity: 0.06,
  });
  const back = new Mesh(new PlaneGeometry(SLAB_W + 0.08, SLAB_H + 0.08), backMat);
  back.position.z = -0.06;
  group.add(back);

  const innerW = SLAB_W * 0.88;
  const innerH = SLAB_H * 0.78;
  const innerGeo = new PlaneGeometry(innerW, innerH);

  let videoEl: HTMLVideoElement | null = null;
  let innerMat: MeshBasicMaterial;
  let fallback: SlabData['fallback'] = null;

  if (project.videoSrc) {
    videoEl = document.createElement('video');
    videoEl.crossOrigin = 'anonymous';
    videoEl.loop = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    deferVideoSource(videoEl, project.videoSrc);
    const vt = new VideoTexture(videoEl);
    vt.colorSpace = SRGBColorSpace;
    innerMat = new MeshBasicMaterial({ map: vt, toneMapped: true });
  } else if (project.imageSrc) {
    const tex = new TextureLoader().load(project.imageSrc);
    tex.colorSpace = SRGBColorSpace;
    innerMat = new MeshBasicMaterial({ map: tex, toneMapped: true });
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;
    drawFallbackFrame(ctx, canvas.width, canvas.height, 0, project.title);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.needsUpdate = true;
    innerMat = new MeshBasicMaterial({ map: tex, toneMapped: true });
    fallback = { ctx, canvas, tex };
  }

  const inner = new Mesh(innerGeo, innerMat);
  inner.position.z = 0.02;
  group.add(inner);

  const title = new Text() as TroikaText;
  title.text = project.title;
  title.fontSize = 0.18;
  title.color = 0xe8eeff;
  title.anchorX = 'center';
  title.anchorY = 'bottom';
  title.maxWidth = SLAB_W * 0.9;
  title.position.set(0, SLAB_H * 0.5 + 0.15, 0.04);
  title.material = new MeshBasicMaterial({ color: 0xe8eeff, transparent: true });
  title.sync();
  group.add(title);

  let subtitle: TroikaText | null = null;
  if (project.subtitle) {
    subtitle = new Text() as TroikaText;
    subtitle.text = project.subtitle;
    subtitle.fontSize = 0.09;
    subtitle.color = 0xa5b4fc;
    subtitle.anchorX = 'center';
    subtitle.anchorY = 'top';
    subtitle.maxWidth = SLAB_W * 0.85;
    subtitle.position.set(0, SLAB_H * 0.5 + 0.04, 0.04);
    subtitle.material = new MeshBasicMaterial({ color: 0xa5b4fc, transparent: true });
    subtitle.sync();
    group.add(subtitle);
  }

  return { group, video: videoEl, fallback, title, subtitle, mat: innerMat };
}

/**
 * Immersive client detail gallery — large glass slabs in staggered depth,
 * floating crystal accents, cinematic lighting. Replaces the water cathedral.
 */
export function createClientGallery(
  projects: readonly ClientGalleryProject[],
): ClientGalleryHandle {
  const group = new Group();

  const list: ClientGalleryProject[] =
    projects.length > 0
      ? [...projects]
      : [{ title: 'YOUR PROJECT', subtitle: 'Glass slab slot' }];

  const slabs: SlabData[] = [];
  const STAGGER_X = 3.8;
  const STAGGER_Z = 2.2;
  const BASE_Y = 1.0;

  list.forEach((proj, i) => {
    const slab = createDetailSlab(proj);
    const side = i % 2 === 0 ? -1 : 1;
    slab.group.position.set(
      side * (STAGGER_X * 0.5 + i * 0.25),
      BASE_Y + Math.sin(i * 1.2) * 0.18,
      -i * STAGGER_Z,
    );
    slab.group.rotation.y = side * 0.12;
    slab.group.rotation.x = -0.04;
    slabs.push(slab);
    group.add(slab.group);
  });

  const crystals: Mesh[] = [];
  const shardGeo = new OctahedronGeometry(0.1, 0);
  const icoGeo = new IcosahedronGeometry(0.065, 0);

  for (let i = 0; i < 12; i++) {
    const geo = i % 2 === 0 ? shardGeo : icoGeo;
    const mat = createGlassMaterial('crystal-shard', {
      emissiveIntensity: 0.15 + Math.random() * 0.2,
    });
    const mesh = new Mesh(geo, mat);
    const angle = (i / 12) * Math.PI * 2;
    const r = 3.5 + Math.random() * 2.5;
    mesh.position.set(
      Math.cos(angle) * r,
      0.4 + Math.random() * 1.8,
      Math.sin(angle) * r - (list.length * STAGGER_Z) * 0.4,
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    mesh.scale.setScalar(0.6 + Math.random() * 0.9);
    crystals.push(mesh);
    group.add(mesh);
  }

  const lighting = createCinematicLighting('gallery');
  group.add(lighting.key, lighting.fill, lighting.rim);

  return {
    group,
    update(elapsed: number, _localT: number) {
      lighting.update(elapsed);

      for (let i = 0; i < crystals.length; i++) {
        const c = crystals[i];
        c.rotation.y = elapsed * 0.15 + i * 0.5;
        c.rotation.x = elapsed * 0.08 + i * 0.3;
        c.position.y += Math.sin(elapsed * 0.4 + i * 0.7) * 0.0003;
      }

      for (const slab of slabs) {
        slab.title.sync();
        slab.subtitle?.sync();
        if (slab.fallback) {
          drawFallbackFrame(
            slab.fallback.ctx,
            slab.fallback.canvas.width,
            slab.fallback.canvas.height,
            elapsed,
            slab.title.text,
          );
          slab.fallback.tex.needsUpdate = true;
        }
      }
    },
    dispose() {
      lighting.dispose();
      shardGeo.dispose();
      icoGeo.dispose();

      for (const c of crystals) {
        (c.material as ReturnType<typeof createGlassMaterial>).dispose();
      }

      for (const slab of slabs) {
        slab.title.dispose();
        slab.subtitle?.dispose();
        slab.mat.dispose();
        if (slab.video) {
          slab.video.pause();
          slab.video.src = '';
        }
        if (slab.fallback) slab.fallback.tex.dispose();
        slab.group.traverse((o) => {
          if ((o as Mesh).isMesh) {
            (o as Mesh).geometry.dispose();
          }
        });
      }
    },
  };
}
