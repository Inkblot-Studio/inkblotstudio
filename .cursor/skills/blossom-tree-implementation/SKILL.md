---
name: blossom-tree-implementation
description: Implements the blossom tree 3D experience following polished specs. Use when building the 3D hero, ImmersiveWorld, blossom theme, mouse/scroll interaction, or blossom-related components.
---

# Blossom Tree Implementation

When implementing the blossom tree 3D experience, follow the specs in `docs/3d-implementation-guide/`.

## Key Params

### Mouse Interaction

| Param | Value | Use |
|-------|-------|-----|
| MAX_ROTATION | 0.14 rad (~8°) | Tree sway max |
| LERP | 0.04 | Parallax easing |
| IDLE_TIMEOUT | 4000 | Settle to calm (ms) |
| pointerInfluence | 0.02 | Particle drift toward pointer |
| wakeBoost | 1.05 | Emissive pulse on first move |
| wakeDuration | 2000 | Pulse duration (ms) |

**Touch:** Disable parallax (`pointerType === 'touch'`). No hover.

### Scroll Choreography

| Scroll | Camera | Tree |
|--------|--------|------|
| 0–0.15 | (0, 0, 8) | Visible |
| 0.15–0.4 | Arc right, rise | Scale 1 → 0.6, fade |
| 0.4–0.7 | Continue arc | Proof scene |
| 0.7–1 | Return center | CTA |

Easing: `easeInOutCubic`. Throttle 60fps. `prefers-reduced-motion` → instant jumps.

### Effects Restraint

- Bloom: intensity 0.3–0.4
- Particles: max 500–800, slow drift
- Trails: 1–2, low opacity
- Parallax: 8° max
- Idle: 4–8s loops, barely perceptible

## Dynamic Blossom Color

Use `getBlossomColors(theme?)` from `web/src/lib/theme/blossom-theme.ts`. Pass to materials (emissive, particles). Presets: `spring`, `autumn`, `winter`. Set via `data-theme` on `<html>`.

## Typography

- Display: Geist, Satoshi, 500–600
- Body: Geist, Inter, 400
- Scroll CTA: uppercase, letter-spacing 0.15em

## References

- [BLOSSOM-TREE-CONCEPT.md](../../../docs/3d-implementation-guide/BLOSSOM-TREE-CONCEPT.md)
- [02-INTERACTION-INPUT-GUIDE.md](../../../docs/3d-implementation-guide/02-INTERACTION-INPUT-GUIDE.md) §11
- [05-CREATIVE-MOTION-GUIDE.md](../../../docs/3d-implementation-guide/05-CREATIVE-MOTION-GUIDE.md)
- [10-LOADING-SCREEN-GUIDE.md](../../../docs/3d-implementation-guide/10-LOADING-SCREEN-GUIDE.md)
