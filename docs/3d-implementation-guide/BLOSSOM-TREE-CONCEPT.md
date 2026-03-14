# Blossom Tree Concept — Visual Direction

> **Creative direction:** A premium 3D web experience centered on a stylized blossom tree. Ethereal, luxury, future-defining — like stepping into a digital sakura garden.

---

## Visual References (Generated)

Two concept images are in this folder:

1. **`assets/blossom-tree-hero-concept.png`** — Hero section mockup: central blossom tree with glowing branches, floating pink/white particles, dark atmospheric background, minimalist UI.
2. **`assets/blossom-palette-and-layout-spec.png`** — Color swatches and layout wireframe for quick reference.

*(Open these files in your IDE or file explorer to view.)*

---

## Concept: Blossom Tree as Hero

### Narrative

The blossom tree symbolizes **growth, renewal, and organic intelligence**. Unlike cold tech aesthetics, it feels alive, premium, and human. Perfect for a company that orchestrates AI systems — the tree suggests natural complexity, beauty, and flow.

### Central 3D Element

- **Hero object:** Stylized cherry blossom tree (abstract, not literal).
- **Material:** Translucent branches, emissive blossom nodes, soft glow.
- **Motion:** Gentle sway, floating petals, particle trails in blossom colors.
- **Interaction:** Pointer influences branch sway and particle flow; blossoms react to hover.

### Scene Layers

| Layer | Content |
|-------|---------|
| Background | Deep plum → charcoal gradient, subtle atmospheric depth |
| Tree | Central 3D blossom tree, glass-like branches, glowing nodes |
| Particles | Floating petals, blossom-colored trails, soft bloom |
| UI | "SCROLL DOWN", minimal nav (WORK, CONTACT) |

---

## Blossom Color Palette

### Primary

| Name | Hex | Use |
|------|-----|-----|
| Blossom Pink | `#ffb7c5` | Primary emissive, hero glow |
| Sakura | `#f8a5b8` | Secondary accent, trails |
| Pale Petal | `#ffd6e0` | Soft highlights, particles |
| Cream White | `#fff8f0` | Text, brightest accents |

### Background

| Name | Hex | Use |
|------|-----|-----|
| Deep Plum | `#2d1b3d` | Atmospheric gradient top |
| Charcoal | `#1a1518` | Base void |
| Soft Ink | `#241e28` | Surface, UI elevation |

### Emissive / Glow

| Name | Hex | Use |
|------|-----|-----|
| Blossom Glow | `#ffb7c5` | Hero tree, main glow |
| Petal Light | `#ffd6e0` | Particle trails |
| Warm Bloom | `#fff0f5` | Rim light, highlights |

---

## CSS Variables (Blossom)

```css
:root {
  /* Background */
  --color-void: #1a1518;
  --color-base: #241e28;
  --color-plum: #2d1b3d;
  --color-surface: #2a2433;
  --color-surface-elevated: #352d40;

  /* Blossom palette */
  --color-blossom: #ffb7c5;
  --color-sakura: #f8a5b8;
  --color-petal: #ffd6e0;
  --color-cream: #fff8f0;

  /* Emissive */
  --color-glow: #ffb7c5;
  --color-glow-soft: #ffd6e0;
  --color-glow-warm: #fff0f5;

  /* UI */
  --color-ui-border: rgba(255, 248, 240, 0.15);
  --color-ui-text: #f5e6eb;
  --color-ui-text-bright: #fff8f0;
  --color-ui-cta-glow: rgba(255, 183, 197, 0.4);
}
```

---

## Layout (Hero)

```
┌─────────────────────────────────────────────────────────┐
│  [WORK]  [CONTACT]                                    Nav│
│                                                         │
│                                                         │
│                    🌸 Blossom Tree                       │
│                   (central 3D hero)                     │
│              • floating petals • trails •               │
│                                                         │
│                                                         │
│                                                         │
│                   S C R O L L   D O W N                 │
└─────────────────────────────────────────────────────────┘
```

- Full viewport canvas.
- Tree centered, slightly above vertical center.
- Scroll CTA at bottom third.
- Nav top-right, minimal.

---

## Motion Language (Blossom)

- **Tree:** Gentle sway (4–8s loop), subtle branch movement.
- **Particles:** Slow float, petal-like drift, soft trails.
- **Intro:** Tree grows/blooms in over 1.5–2.5s.
- **Interaction:** Pointer adds parallax sway; blossoms brighten on proximity.

---

## Dynamic Blossom Color System

**Goal:** Single source of truth for blossom color. Change one variable or preset to shift the entire palette (e.g., seasonal: spring pink, autumn amber, winter white).

### Architecture

- **Base variable:** `--blossom-color: #ffb7c5` in CSS. All blossom-related vars derive from it or preset.
- **Presets:** `data-theme="spring"` | `"autumn"` | `"winter"` on `<html>`. Full palette per preset.
- **Implementation:** `web/src/lib/theme/blossom-theme.ts` exports `getBlossomColors(theme?)` and `BLOSSOM_THEMES`.
- **Three.js:** Import `getBlossomColors()` and pass to materials (emissive, particle colors).

### Preset Palette

| Preset | Base | Sakura | Petal | Glow |
|--------|------|--------|-------|------|
| spring | #ffb7c5 | #f8a5b8 | #ffd6e0 | #ffb7c5 |
| autumn | #e8a87c | #d4956a | #f0d0b8 | #e8a87c |
| winter | #e8f4f8 | #c8e4f0 | #f0f8ff | #e8f4f8 |

---

## Interaction Spec (Mouse & Touch)

| Interaction | Behavior | Params |
|-------------|----------|--------|
| **Pointer move** | Tree sway follows NDC. Strong easing. Max ±8°. | `MAX_ROTATION = 0.14`, `LERP = 0.04` |
| **Idle settle** | After 4s no input, target drifts to (0,0). | `IDLE_TIMEOUT = 4000` |
| **Particle flow** | Particles subtly drift toward pointer (2–3%). | `pointerInfluence = 0.02` |
| **Emissive pulse** | On first pointer move: +5% intensity for 2s. | `wakeBoost = 1.05`, `wakeDuration = 2000` |
| **Hover (3D UI)** | Scale 1.02 (not 1.05). 150ms ease-out. | Restrained |
| **Touch** | No parallax. Tap = click. No hover. | Disable sway on touch |

---

## Typography

| Use | Font | Weight |
|-----|------|--------|
| Display / Hero | Geist, Satoshi | 500–600 |
| Body | Geist, Inter | 400 |
| Nav / UI | Same as body | 500 |
| Scroll CTA | Same as body | 400, uppercase, letter-spacing 0.15em |

**Avoid:** Serif for body, decorative fonts, more than 2 families.

---

## Loading Screen

Professional loading screen with progress (0–100%). See [10-LOADING-SCREEN-GUIDE.md](10-LOADING-SCREEN-GUIDE.md) for full spec.

- **Layout:** Blossom tree icon/silhouette, company name, progress bar + percentage.
- **Background:** Same as hero (deep plum/charcoal gradient).
- **Min display time:** 800ms (avoid flash if load is instant).
- **Transition out:** Fade to hero over 400ms when progress = 100%.

---

## Differentiation from Activetheory

| Activetheory | Blossom Tree |
|--------------|--------------|
| Cool cyan/tech | Warm blossom/organic |
| Abstract "A" form | Living tree metaphor |
| Metallic, electric | Soft, organic, luminous |
| Cold premium | Warm premium |

---

*Use this concept with the Master Guide. Replace cyan/teal palette with blossom palette in implementation.*
