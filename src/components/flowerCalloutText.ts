import {
  CanvasTexture,
  Color,
  Group,
  LinearFilter,
  Raycaster,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  type Vector2,
} from 'three';
import type { JourneyState } from '@/journey/sectionMap';
import { damp, smoothstep } from '@/utils/math';
import type { FrameContext, IComponent } from '@/types';
import type { InteractionSystem } from '@/systems/interactionSystem';

const CALLOUT = "Ready for what's next?";
/** Splits the line for per-segment light (keeps “what’s” intact). */
const CALLOUT_PARTS: readonly string[] = CALLOUT.split(/(\s+)/);
/**
 * Local space in front of the camera: +Y up, −Z into the scene (toward the flower).
 * Parenting the copy to the camera keeps it from swimming when the world/camera orbits.
 */
const CAM_LOCAL = { x: 0, y: 0.46, z: -4.25 } as const;

const CANVAS_W = 2200;
const CANVAS_H = 520;
const BASE_WIDTH = 7.85 * 0.4;

const ICE = { r: 125, g: 211, b: 252 };
const MIST = { r: 240, g: 249, b: 255 };

export class FlowerCalloutTextComponent implements IComponent {
  readonly group = new Group();
  private sprite: Sprite | null = null;
  private material: SpriteMaterial | null = null;
  private map: CanvasTexture | null = null;
  private canvas2d: CanvasRenderingContext2D | null = null;
  private journey: JourneyState | null = null;
  private domEl: HTMLElement | null = null;
  private hoverSm = 0;
  private scrollSm = 0;
  private readonly ray = new Raycaster();
  /** Damped pointer in canvas space (px). */
  private ptrX = CANVAS_W * 0.5;
  private ptrY = CANVAS_H * 0.5;
  private reducedMotion = false;
  private baseFontSizePx = 100;

  constructor(
    private readonly isFlowerExperience: () => boolean,
    private readonly getInteraction: () => InteractionSystem | null,
    private readonly getScrollSpeedPx: () => number,
  ) {
    this.group.name = 'flower-callout-sprite';
  }

  setJourneyState(state: JourneyState | null): void {
    this.journey = state;
  }

  private buildFont(): string {
    return `600 ${this.baseFontSizePx}px "Syne", "Outfit", "Fraunces", system-ui, sans-serif`;
  }

  private pickFont(graphics: CanvasRenderingContext2D, w: number, h: number): void {
    this.baseFontSizePx = Math.round(100 * (w / 2200));
    graphics.font = this.buildFont();
    const pad = 12;
    const maxW = w - pad * 2;
    if (graphics.measureText(CALLOUT).width > maxW) {
      const scale = maxW / graphics.measureText(CALLOUT).width;
      this.baseFontSizePx = Math.max(36, Math.round(100 * (w / 2200) * scale));
    }
    graphics.font = this.buildFont();
  }

  private drawToCanvas(
    g: CanvasRenderingContext2D,
    w: number,
    h: number,
    vis: number,
    pointerCanvas: { x: number; y: number } | null,
    onSprite: number,
    elapsed: number,
    scrollSm: number,
  ): void {
    const alpha = vis;
    g.clearRect(0, 0, w, h);
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in g) {
      g.imageSmoothingQuality = 'high';
    }
    g.lineJoin = 'round';
    g.miterLimit = 2;

    this.pickFont(g, w, h);
    const cy = (h * 0.5) | 0;
    const fs = this.baseFontSizePx;

    let totalW = 0;
    for (const p of CALLOUT_PARTS) {
      totalW += g.measureText(p).width;
    }
    let x0 = 0.5 * w - 0.5 * totalW;
    if (x0 < 8) {
      x0 = 8;
    }

    const onMark = pointerCanvas !== null && onSprite > 0.1;
    const doRipple = onMark && !this.reducedMotion;
    const px = this.ptrX;
    const py = this.ptrY;
    if (doRipple) {
      const breath = 0.88 + 0.12 * Math.sin(elapsed * 1.65);
      const rBase = 44 + 18 * breath;
      g.save();
      g.globalCompositeOperation = 'screen';
      for (const ring of [0.45, 0.8, 1] as const) {
        const rad = rBase * ring;
        const a = 0.038 * (1.15 - ring * 0.5) * onSprite * alpha;
        const grd = g.createRadialGradient(px, py, 0, px, py, rad);
        grd.addColorStop(0, `rgba(125,211,252,${a * 0.45})`);
        grd.addColorStop(0.5, `rgba(125,211,252,${a * 0.16})`);
        grd.addColorStop(1, 'rgba(125,211,252,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, w, h);
      }
      g.restore();
    }

    let x = x0;
    for (const part of CALLOUT_PARTS) {
      const m = g.measureText(part);
      const partW = m.width;
      if (part.trim() === '') {
        x += partW;
        continue;
      }

      const xL = x;
      const xR = x + partW;
      const yT = cy - fs * 0.42;
      const yB = cy + fs * 0.42;
      const cxB = 0.5 * (xL + xR);
      const cyB = 0.5 * (yT + yB);
      const dx = Math.max(xL, Math.min(px, xR)) - px;
      const dy = Math.max(yT, Math.min(py, yB)) - py;
      const dEdge = onMark
        ? Math.hypot(dx, dy)
        : 9999;
      const dCenter = onMark ? Math.hypot(px - cxB, py - cyB) : 9999;
      const d = Math.min(dEdge, dCenter);
      const sigma = fs * 0.95;
      const localGlow = onMark
        ? Math.max(0, Math.exp(-(d * d) / (2 * sigma * sigma)) * onSprite * alpha)
        : 0;
      const mix = Math.min(1, 0.1 * scrollSm + (onMark ? 0.9 * localGlow : 0));

      const r = MIST.r + (ICE.r - MIST.r) * mix;
      const gg = MIST.g + (ICE.g - MIST.g) * mix;
      const b = MIST.b + (ICE.b - MIST.b) * mix;
      g.shadowColor = `rgba(2,6,23,${0.9 * alpha})`;
      g.shadowBlur = 18 * alpha;
      g.shadowOffsetX = 0;
      g.shadowOffsetY = 0;
      g.fillStyle = `rgba(${r | 0},${gg | 0},${b | 0},${0.99 * alpha})`;
      g.fillText(part, x, cy);
      g.shadowBlur = 0;
      x += partW;
    }
  }

  init(ctx: FrameContext): void {
    this.domEl = ctx.renderer.domElement;
    this.reducedMotion =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const c2d = canvas.getContext('2d');
    if (!c2d) {
      return;
    }
    this.canvas2d = c2d;

    this.drawToCanvas(c2d, CANVAS_W, CANVAS_H, 1, null, 0, 0, 0);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.generateMipmaps = false;
    this.map = tex;

    const mat = new SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0,
      sizeAttenuation: true,
    });
    mat.color = new Color(0xffffff);
    this.material = mat;

    const sp = new Sprite(mat);
    sp.renderOrder = 30;
    const a = BASE_WIDTH;
    sp.scale.set(a, a * (CANVAS_H / CANVAS_W), 1);
    this.sprite = sp;
    this.group.add(sp);
    this.group.position.set(CAM_LOCAL.x, CAM_LOCAL.y, CAM_LOCAL.z);
    this.group.renderOrder = 5;
    ctx.camera.add(this.group);
  }

  private clearCursor(): void {
    if (this.domEl) {
      this.domEl.style.removeProperty('cursor');
    }
  }

  update(ctx: FrameContext): void {
    if (!this.sprite || !this.material || !this.map || !this.canvas2d) {
      return;
    }

    const on = this.isFlowerExperience();
    this.group.visible = on;
    this.material.opacity = 0;
    this.material.color.setRGB(1, 1, 1);
    if (!on || !this.journey) {
      this.hoverSm = damp(this.hoverSm, 0, 10, ctx.delta);
      this.scrollSm = damp(this.scrollSm, 0, 5, ctx.delta);
      this.clearCursor();
      return;
    }

    if (this.journey.section !== 0) {
      this.hoverSm = damp(this.hoverSm, 0, 10, ctx.delta);
      this.scrollSm = damp(this.scrollSm, 0, 5, ctx.delta);
      this.clearCursor();
      return;
    }

    const lt = this.journey.localT;
    const enter = smoothstep(0.34, 0.52, lt);
    const exit = 1 - smoothstep(0.76, 0.92, lt);
    const vis = enter * exit;

    if (vis < 0.0005) {
      this.hoverSm = damp(this.hoverSm, 0, 10, ctx.delta);
      this.scrollSm = damp(this.scrollSm, 0, 5, ctx.delta);
      this.clearCursor();
      return;
    }

    this.material.opacity = vis;

    const int = this.getInteraction();
    const aspect = CANVAS_H / CANVAS_W;

    let over = 0;
    let uv: Vector2 | null = null;
    if (int) {
      this.ray.setFromCamera(int.rawPointer, ctx.camera);
      const hits = this.ray.intersectObject(this.sprite, false);
      if (hits.length > 0) {
        const h = hits[0] as { uv?: Vector2 | undefined };
        over = 1;
        if (h.uv) {
          uv = h.uv;
        }
      }
    }

    const scrollTarget = this.reducedMotion
      ? 0
      : Math.min(1, Math.abs(this.getScrollSpeedPx()) / 1100);
    this.scrollSm = damp(this.scrollSm, scrollTarget, 5, ctx.delta);

    const hoverTarget = this.reducedMotion ? 0 : over;
    this.hoverSm = damp(this.hoverSm, hoverTarget, 16, ctx.delta);

    if (uv && this.hoverSm > 0.02) {
      const tx = uv.x * CANVAS_W;
      const ty = (1 - uv.y) * CANVAS_H;
      this.ptrX = damp(this.ptrX, tx, 22, ctx.delta);
      this.ptrY = damp(this.ptrY, ty, 22, ctx.delta);
    } else {
      this.ptrX = damp(this.ptrX, 0.5 * CANVAS_W, 5, ctx.delta);
      this.ptrY = damp(this.ptrY, 0.5 * CANVAS_H, 5, ctx.delta);
    }

    let pointerCanvas: { x: number; y: number } | null = null;
    if (over > 0.5 && uv) {
      pointerCanvas = { x: this.ptrX, y: this.ptrY };
    }

    this.drawToCanvas(
      this.canvas2d,
      CANVAS_W,
      CANVAS_H,
      1,
      pointerCanvas,
      this.hoverSm,
      ctx.elapsed,
      this.scrollSm,
    );
    this.map.needsUpdate = true;

    const scrollK = 0.96 + 0.04 * enter + 0.06 * this.scrollSm;
    const w = BASE_WIDTH * scrollK;
    this.sprite.scale.set(w, w * aspect, 1);

    this.group.position.set(CAM_LOCAL.x, CAM_LOCAL.y, CAM_LOCAL.z);
    this.group.updateMatrixWorld(true);

    if (int && this.domEl && this.material.opacity > 0.12) {
      this.domEl.style.cursor = over === 1 ? 'pointer' : 'default';
    } else {
      this.clearCursor();
    }
  }

  dispose(): void {
    this.clearCursor();
    this.group.removeFromParent();
    this.material?.dispose();
    this.map?.dispose();
  }
}
