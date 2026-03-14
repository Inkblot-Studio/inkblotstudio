---
name: inkblot-design-system
description: Applies Inkblot design tokens: blossom color system, typography, loading screen patterns. Use when working with blossom color, theme, loading screen, design tokens, or CSS variables for the 3D experience.
---

# Inkblot Design System

Apply design tokens consistently when implementing UI, loading, and theme-related features.

## Blossom Color System

### Single Base Variable

```css
:root {
  --blossom-color: #ffb7c5;
}
```

Change this one line to shift the entire blossom palette. Use in CSS for UI, progress bar, etc.

### Presets

| Preset | Base | Apply |
|--------|------|-------|
| spring | #ffb7c5 | `data-theme="spring"` on `<html>` |
| autumn | #e8a87c | `data-theme="autumn"` |
| winter | #e8f4f8 | `data-theme="winter"` |

### Three.js

Import `getBlossomColors(theme?)` from `web/src/lib/theme/blossom-theme.ts`. Returns `{ base, sakura, petal, glow, baseHex, ... }` for materials and particles.

## Typography

```css
:root {
  --font-display: "Geist", "Satoshi", system-ui;
  --font-body: "Geist", "Inter", system-ui;
}
```

| Use | Font | Weight |
|-----|------|--------|
| Display / Hero | var(--font-display) | 500–600 |
| Body | var(--font-body) | 400 |
| Nav / UI | var(--font-body) | 500 |
| Scroll CTA | var(--font-body) | 400, uppercase, letter-spacing 0.15em |

## Loading Screen

- Progress bar with percentage (0–100%)
- Source: Three.js `LoadingManager.onProgress`
- Min display: 800ms
- Transition out: 400ms fade
- Background: same as hero (plum/charcoal)

See [10-LOADING-SCREEN-GUIDE.md](../../../docs/3d-implementation-guide/10-LOADING-SCREEN-GUIDE.md).

## References

- [BLOSSOM-TREE-CONCEPT.md](../../../docs/3d-implementation-guide/BLOSSOM-TREE-CONCEPT.md)
- [09-VISUAL-REFERENCE-ACTIVETHEORY-BEYOND.md](../../../docs/3d-implementation-guide/09-VISUAL-REFERENCE-ACTIVETHEORY-BEYOND.md)
- [10-LOADING-SCREEN-GUIDE.md](../../../docs/3d-implementation-guide/10-LOADING-SCREEN-GUIDE.md)
