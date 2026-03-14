/**
 * Blossom theme configuration.
 * Single source of truth for blossom colors. Change base or preset to shift entire palette.
 * See docs/3d-implementation-guide/BLOSSOM-TREE-CONCEPT.md
 */

export type BlossomPreset = 'spring' | 'autumn' | 'winter';

export interface BlossomPalette {
	base: string;
	sakura: string;
	petal: string;
	glow: string;
	glowSoft: string;
}

export const BLOSSOM_THEMES: Record<BlossomPreset, BlossomPalette> = {
	spring: {
		base: '#ffb7c5',
		sakura: '#f8a5b8',
		petal: '#ffd6e0',
		glow: '#ffb7c5',
		glowSoft: '#ffd6e0',
	},
	autumn: {
		base: '#e8a87c',
		sakura: '#d4956a',
		petal: '#f0d0b8',
		glow: '#e8a87c',
		glowSoft: '#f0d0b8',
	},
	winter: {
		base: '#e8f4f8',
		sakura: '#c8e4f0',
		petal: '#f0f8ff',
		glow: '#e8f4f8',
		glowSoft: '#f0f8ff',
	},
};

export interface BlossomColors {
	base: string;
	sakura: string;
	petal: string;
	glow: string;
	glowSoft: string;
	/** Three.js hex (e.g. 0xffb7c5) */
	baseHex: number;
	sakuraHex: number;
	petalHex: number;
	glowHex: number;
}

function hexToNumber(hex: string): number {
	return parseInt(hex.replace('#', ''), 16);
}

const PRESETS: BlossomPreset[] = ['spring', 'autumn', 'winter'];

function isValidPreset(v: string): v is BlossomPreset {
	return PRESETS.includes(v as BlossomPreset);
}

/**
 * Get blossom colors for current theme. Use preset or fall back to spring.
 * For CSS override: set --blossom-color and data-theme on <html>; app can pass theme from dataset.
 * Pass to Three.js materials and particle systems.
 */
export function getBlossomColors(theme?: BlossomPreset | null): BlossomColors {
	const ds = typeof document !== 'undefined' ? document.documentElement.dataset.theme ?? '' : '';
	const fromDataset = isValidPreset(ds) ? (ds as BlossomPreset) : null;
	const resolvedTheme: BlossomPreset = theme ?? fromDataset ?? 'spring';
	const palette = BLOSSOM_THEMES[resolvedTheme];

	return {
		...palette,
		baseHex: hexToNumber(palette.base),
		sakuraHex: hexToNumber(palette.sakura),
		petalHex: hexToNumber(palette.petal),
		glowHex: hexToNumber(palette.glow),
	};
}
