import type { Camera, Scene, WebGLRenderer } from 'three';

/** Hex color values used across the scene — mirrors the design palette. */
export interface ColorPalette {
  readonly primary: number;
  readonly primaryHover: number;
  readonly accent: number;
  readonly background: number;
  readonly surface: number;
  readonly textPrimary: number;
  readonly textMuted: number;
  readonly border: number;
}

/** Shared context passed to every system and component each frame. */
export interface FrameContext {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: Camera;
  /** Seconds since last frame. */
  delta: number;
  /** Seconds since app start. */
  elapsed: number;
}

/** Lifecycle contract for all systems (scroll, animation, interaction). */
export interface ISystem {
  init(ctx: FrameContext): void;
  update(ctx: FrameContext): void;
  dispose(): void;
}

/** Lifecycle contract for all scene components (flowers, particles, env). */
export interface IComponent {
  init(ctx: FrameContext): void;
  update(ctx: FrameContext): void;
  dispose(): void;
}

/** Viewport dimensions in CSS pixels and device pixel ratio. */
export interface ViewportSize {
  width: number;
  height: number;
  pixelRatio: number;
  aspect: number;
}
