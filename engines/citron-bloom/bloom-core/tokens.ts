import { Color } from 'three';
import { STUDIO_PALETTE_HEX as H } from './palette';

function hex(s: string): Color {
  return new Color(s);
}

/**
 * Three.js colors aligned with the Inkblot studio palette (dominant / support / accent / neutrals).
 * Legacy names (citron*) map to blue primary ramp + accent for minimal shader churn.
 */
export const BloomTokens = {
  backgroundPrimary: hex(H.background),
  backgroundSecondary: hex(H.surface),
  backgroundTertiary: hex(H.border),
  textPrimary: hex(H.textPrimary),
  textSecondary: hex(H.textMuted),
  citron300: hex(H.support),
  citron400: hex(H.primary).clone().lerp(hex(H.support), 0.38),
  citron500: hex(H.primary),
  citron600: hex(H.primary).clone().lerp(hex(H.border), 0.42),
  citron700: hex(H.border),
  interactivePrimary: hex(H.primary),
  interactiveHover: hex(H.support),
  success: hex(H.accent),
  info: hex(H.support),
} as const;

/** Spacing token values as numbers (px) for UI layout next to the canvas. */
export const BloomSpacing = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s8: 32,
} as const;
