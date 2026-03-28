import {
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  VideoTexture,
} from 'three';
import type { WebGLRenderer } from 'three';
import { Text } from 'troika-three-text';
import { createRoundedPlateGeometry } from './roundedPlateGeometry';
import { deferVideoSource } from './deferVideoSource';

/** Troika `Text` runtime props missing from bundled typings. */
type TroikaText = Text & {
  anchorX: string;
  anchorY: string;
  maxWidth: number;
};

export interface FloatingVideoTileOptions {
  width?: number;
  height?: number;
  cornerRadius?: number;
  frameDepth?: number;
  title: string;
  subtitle?: string;
  /** Optional HLS/mp4 URL — if omitted, an animated procedural canvas is used. */
  videoSrc?: string;
  /** Title / subtitle colour (hex). */
  textColor?: number;
  /** Subtitle colour (hex). */
  subtitleColor?: number;
}

export interface FloatingVideoTileHandle {
  readonly group: Group;
  update(renderer: WebGLRenderer, elapsed: number): void;
  dispose(): void;
}

function drawFallbackFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  elapsed: number,
): void {
  const g = ctx.createLinearGradient(0, 0, w, h);
  const hue = (elapsed * 18) % 360;
  g.addColorStop(0, `hsla(${hue}, 70%, 45%, 1)`);
  g.addColorStop(0.45, `hsla(${(hue + 40) % 360}, 65%, 22%, 1)`);
  g.addColorStop(1, `hsla(${(hue + 120) % 360}, 55%, 35%, 1)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 40; i++) {
    const x = (Math.sin(elapsed * 0.7 + i) * 0.5 + 0.5) * w;
    const y = (Math.cos(elapsed * 0.55 + i * 0.3) * 0.5 + 0.5) * h;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function createFloatingVideoTile(options: FloatingVideoTileOptions): FloatingVideoTileHandle {
  const width = options.width ?? 1.35;
  const height = options.height ?? 0.78;
  const corner = options.cornerRadius ?? 0.09;
  const depth = options.frameDepth ?? 0.045;
  const textColor = options.textColor ?? 0xf8fafc;
  const subColor = options.subtitleColor ?? 0x94a3b8;

  const group = new Group();

  const plateGeo = createRoundedPlateGeometry(width, height, corner, depth, 12);
  plateGeo.center();

  const glass = new MeshPhysicalMaterial({
    color: new Color(0x0a1224),
    metalness: 0.2,
    roughness: 0.12,
    transmission: 0.72,
    thickness: 0.65,
    ior: 1.45,
    transparent: true,
    opacity: 1,
    side: DoubleSide,
    emissive: new Color(0x1e1b4b),
    emissiveIntensity: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });

  const frame = new Mesh(plateGeo, glass);
  group.add(frame);

  const innerW = width * 0.88;
  const innerH = height * 0.72;
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
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 288;
    const ctx = canvas.getContext('2d')!;
    drawFallbackFrame(ctx, canvas.width, canvas.height, 0);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.needsUpdate = true;
    innerMat = new MeshBasicMaterial({ map: tex, toneMapped: true });
    fallback = { ctx, canvas, tex };
  }

  const inner = new Mesh(innerGeo, innerMat);
  inner.position.z = depth * 0.5 + 0.018;
  inner.position.y = -height * 0.04;
  group.add(inner);

  const title = new Text() as TroikaText;
  title.text = options.title;
  title.fontSize = 0.11;
  title.color = textColor;
  title.anchorX = 'center';
  title.anchorY = 'bottom';
  title.maxWidth = width * 0.92;
  title.position.set(0, height * 0.38, depth * 0.5 + 0.045);
  title.material = new MeshBasicMaterial({
    color: textColor,
    transparent: true,
  });
  title.sync();
  group.add(title);

  let subtitle: TroikaText | null = null;
  if (options.subtitle) {
    subtitle = new Text() as TroikaText;
    subtitle.text = options.subtitle;
    subtitle.fontSize = 0.055;
    subtitle.color = subColor;
    subtitle.anchorX = 'center';
    subtitle.anchorY = 'top';
    subtitle.maxWidth = width * 0.88;
    subtitle.position.set(0, height * 0.32, depth * 0.5 + 0.048);
    subtitle.material = new MeshBasicMaterial({
      color: subColor,
      transparent: true,
    });
    subtitle.sync();
    group.add(subtitle);
  }

  return {
    group,
    update(_renderer: WebGLRenderer, elapsed: number) {
      title.sync();
      subtitle?.sync();
      if (fallback) {
        drawFallbackFrame(fallback.ctx, fallback.canvas.width, fallback.canvas.height, elapsed);
        fallback.tex.needsUpdate = true;
      }
    },
    dispose() {
      title.dispose();
      subtitle?.dispose();
      plateGeo.dispose();
      glass.dispose();
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
