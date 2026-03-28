import {
  CanvasTexture,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  Shape,
  SRGBColorSpace,
  TextureLoader,
  VideoTexture,
} from 'three';
import type { WebGLRenderer } from 'three';
import { Text } from 'troika-three-text';
import { deferVideoSource } from '../bloom-showcase/deferVideoSource';

export interface PortfolioCarouselProject {
  readonly title: string;
  readonly subtitle?: string;
  readonly videoSrc?: string;
  readonly imageSrc?: string;
}

export interface PortfolioCarouselHandle {
  readonly group: Group;
  update(renderer: WebGLRenderer, elapsed: number, scrollAngle: number): void;
  dispose(): void;
}

/** Troika `Text` runtime props missing from bundled typings. */
type TroikaText = Text & {
  anchorX: string;
  anchorY: string;
  maxWidth: number;
};

function drawFallbackFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsed: number,
  title: string,
): void {
  const g = ctx.createLinearGradient(0, 0, w, h);
  const hue = (elapsed * 14 + title.length * 7) % 360;
  g.addColorStop(0, `hsla(${hue}, 62%, 38%, 1)`);
  g.addColorStop(0.5, `hsla(${(hue + 55) % 360}, 58%, 22%, 1)`);
  g.addColorStop(1, `hsla(${(hue + 200) % 360}, 50%, 32%, 1)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 48; i++) {
    const x = (Math.sin(elapsed * 0.55 + i * 0.4) * 0.5 + 0.5) * w;
    const y = (Math.cos(elapsed * 0.42 + i * 0.25) * 0.5 + 0.5) * h;
    ctx.fillStyle = '#e8e6ff';
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Same proportions as the Inkblot mark: right-pointing triangle. */
function logoTriangleShape(unit = 1): Shape {
  const s = new Shape();
  s.moveTo(0, 0);
  s.lineTo(unit, unit * 0.5);
  s.lineTo(0, unit);
  s.closePath();
  return s;
}

/** Mirrored slab — matches the flipped triangles in the stacked logo. */
function logoTriangleShapeFlipped(unit = 1): Shape {
  const s = new Shape();
  s.moveTo(0, 0);
  s.lineTo(-unit, unit * 0.5);
  s.lineTo(0, unit);
  s.closePath();
  return s;
}

const SLAB_EXTRUDE = {
  depth: 0.14,
  bevelEnabled: true,
  bevelThickness: 0.038,
  bevelSize: 0.032,
  bevelSegments: 2,
  curveSegments: 14,
};

function createSlabGlassMaterial(): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: new Color(0x121c34),
    metalness: 0.14,
    roughness: 0.07,
    transmission: 0.62,
    thickness: 0.55,
    ior: 1.48,
    iridescence: 0.55,
    iridescenceIOR: 1.2,
    iridescenceThicknessRange: [90, 400],
    transparent: true,
    opacity: 1,
    side: DoubleSide,
    emissive: new Color(0x312e81),
    emissiveIntensity: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
  });
}

interface SlabHandle {
  readonly group: Group;
  update(renderer: WebGLRenderer, elapsed: number): void;
  dispose(): void;
}

function createTrianglePortfolioSlab(
  options: PortfolioCarouselProject,
  alternateHand: boolean,
): SlabHandle {
  const group = new Group();
  const textColor = 0xe8e6ff;
  const subColor = 0xa5b4fc;

  const geo = new ExtrudeGeometry(
    alternateHand ? logoTriangleShapeFlipped(1.15) : logoTriangleShape(1.15),
    SLAB_EXTRUDE,
  );
  geo.center();
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const frame = new Mesh(geo, createSlabGlassMaterial());
  group.add(frame);

  const spanX = bb.max.x - bb.min.x;
  const spanY = bb.max.y - bb.min.y;
  const frontZ = bb.max.z + 0.022;
  const innerW = spanX * 0.52;
  const innerH = spanY * 0.5;
  const innerGeo = new PlaneGeometry(innerW, innerH);

  let videoEl: HTMLVideoElement | null = null;
  let innerMat: MeshBasicMaterial;
  let fallback: { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement; tex: CanvasTexture } | null =
    null;

  if (options.videoSrc) {
    videoEl = document.createElement('video');
    videoEl.crossOrigin = 'anonymous';
    videoEl.loop = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    deferVideoSource(videoEl, options.videoSrc);
    const vt = new VideoTexture(videoEl);
    vt.colorSpace = SRGBColorSpace;
    innerMat = new MeshBasicMaterial({ map: vt, toneMapped: true });
  } else if (options.imageSrc) {
    const tex = new TextureLoader().load(options.imageSrc);
    tex.colorSpace = SRGBColorSpace;
    innerMat = new MeshBasicMaterial({ map: tex, toneMapped: true });
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    drawFallbackFrame(ctx, canvas.width, canvas.height, 0, options.title);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.needsUpdate = true;
    innerMat = new MeshBasicMaterial({ map: tex, toneMapped: true });
    fallback = { ctx, canvas, tex };
  }

  const inner = new Mesh(innerGeo, innerMat);
  inner.position.set(0, -spanY * 0.05, frontZ);
  group.add(inner);

  const title = new Text() as TroikaText;
  title.text = options.title;
  title.fontSize = 0.16;
  title.color = textColor;
  title.anchorX = 'center';
  title.anchorY = 'bottom';
  title.maxWidth = spanX * 0.92;
  title.position.set(0, bb.max.y + 0.12, frontZ + 0.04);
  title.material = new MeshBasicMaterial({ color: textColor, transparent: true });
  title.sync();
  group.add(title);

  let subtitle: TroikaText | null = null;
  if (options.subtitle) {
    subtitle = new Text() as TroikaText;
    subtitle.text = options.subtitle;
    subtitle.fontSize = 0.075;
    subtitle.color = subColor;
    subtitle.anchorX = 'center';
    subtitle.anchorY = 'top';
    subtitle.maxWidth = spanX * 0.88;
    subtitle.position.set(0, bb.max.y + 0.02, frontZ + 0.045);
    subtitle.material = new MeshBasicMaterial({ color: subColor, transparent: true });
    subtitle.sync();
    group.add(subtitle);
  }

  const slabScale = 2.65;
  group.scale.setScalar(slabScale);

  return {
    group,
    update(_renderer: WebGLRenderer, elapsed: number) {
      title.sync();
      subtitle?.sync();
      if (fallback) {
        drawFallbackFrame(
          fallback.ctx,
          fallback.canvas.width,
          fallback.canvas.height,
          elapsed,
          options.title,
        );
        fallback.tex.needsUpdate = true;
      }
    },
    dispose() {
      title.dispose();
      subtitle?.dispose();
      geo.dispose();
      frame.material.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      if (videoEl) {
        videoEl.pause();
        videoEl.src = '';
      }
      if (fallback) {
        fallback.tex.dispose();
      }
    },
  };
}

export function createPortfolioCarousel(
  projects: readonly PortfolioCarouselProject[],
): PortfolioCarouselHandle {
  const group = new Group();
  const slabs: SlabHandle[] = [];

  const list = projects.length > 0 ? projects : [{ title: 'YOUR PROJECT', subtitle: 'Glass slab slot' }];

  list.forEach((p, i) => {
    const slab = createTrianglePortfolioSlab(p, i % 2 === 1);
    slabs.push(slab);
    group.add(slab.group);
  });

  const n = slabs.length;
  const radius = 7.2;
  const arc = Math.min(Math.PI * 1.12, 0.35 + n * 0.38);

  slabs.forEach((slab, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const a = (t - 0.5) * arc;
    slab.group.position.set(
      Math.sin(a) * radius,
      0.95 + Math.sin(i * 1.4) * 0.12,
      Math.cos(a) * radius * 0.9,
    );
    slab.group.rotation.y = -a + Math.PI * 0.12;
    slab.group.rotation.x = -0.06 + Math.sin(i * 0.7) * 0.04;
  });

  return {
    group,
    update(renderer: WebGLRenderer, elapsed: number, scrollAngle: number) {
      group.rotation.y = scrollAngle;
      for (const slab of slabs) {
        slab.update(renderer, elapsed);
      }
    },
    dispose() {
      for (const slab of slabs) slab.dispose();
    },
  };
}
