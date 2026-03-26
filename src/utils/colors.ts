import { Color } from 'three';
import type { ColorPalette } from '@/types';

/**
 * Canonical color palette — single source of truth for the site + Three.js scene.
 *
 * Dominant / Primary: #2563EB · Support / Primary hover: #60A5FA · Accent: #10B981
 * Background: #020617 · Surface: #0B1220 · Text: #F8FAFC / #CBD5E1 · Border: #1E293B
 */
export const PALETTE: ColorPalette = {
  dominant: 0x2563eb,
  support: 0x60a5fa,
  primary: 0x2563eb,
  primaryHover: 0x60a5fa,
  accent: 0x10b981,
  background: 0x020617,
  surface: 0x0b1220,
  textPrimary: 0xf8fafc,
  textMuted: 0xcbd5e1,
  border: 0x1e293b,
} as const;

/** Pre-constructed Three.js Color instances for hot-path usage. */
export const COLORS = {
  dominant: new Color(PALETTE.dominant),
  support: new Color(PALETTE.support),
  primary: new Color(PALETTE.primary),
  primaryHover: new Color(PALETTE.primaryHover),
  accent: new Color(PALETTE.accent),
  background: new Color(PALETTE.background),
  surface: new Color(PALETTE.surface),
  textPrimary: new Color(PALETTE.textPrimary),
  textMuted: new Color(PALETTE.textMuted),
  border: new Color(PALETTE.border),
} as const;
