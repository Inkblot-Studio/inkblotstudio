import { Color } from 'three';
import type { ColorPalette } from '@/types';

/**
 * Canonical color palette — single source of truth for the entire scene.
 *
 * Dominant:       #2563EB  — primary light color, fog tint, bloom highlight
 * Primary Hover:  #60A5FA  — secondary glow, particle trails, rim lights
 * Accent:         #10B981  — subtle accent highlights, interactive feedback
 * Background:     #020617  — renderer clear color, deep-night base
 * Surface:        #0B1220  — placeholder geometry, ground planes
 * Text Primary:   #F8FAFC  — UI overlays (future)
 * Text Muted:     #CBD5E1  — UI secondary text (future)
 * Border:         #1E293B  — UI panel borders (future)
 */
export const PALETTE: ColorPalette = {
  primary:      0x2563eb,
  primaryHover: 0x60a5fa,
  accent:       0x10b981,
  background:   0x020617,
  surface:      0x0b1220,
  textPrimary:  0xf8fafc,
  textMuted:    0xcbd5e1,
  border:       0x1e293b,
} as const;

/** Pre-constructed Three.js Color instances for hot-path usage. */
export const COLORS = {
  primary:      new Color(PALETTE.primary),
  primaryHover: new Color(PALETTE.primaryHover),
  accent:       new Color(PALETTE.accent),
  background:   new Color(PALETTE.background),
  surface:      new Color(PALETTE.surface),
} as const;
