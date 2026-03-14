# Guide 09: Visual Reference — Activetheory Analysis & Beyond

> **For AI:** Use this guide when implementing colors, materials, effects, and UI styling. Reference: activetheory.net. Goal: match and exceed their visual quality.

---

## 1. Activetheory Visual Breakdown

### 1.1 Background & Atmosphere

- **Base:** Deep black, near-void. Creates maximum contrast for luminous elements.
- **Gradient:** Dark metallic teal/cyan in top-left (#0a2f3d → #0d464f) fading into black.
- **Effect:** Feels like looking into a sophisticated digital void or outer space.
- **Our enhancement:** Add second gradient layer (subtle purple #0d0a1a) for depth. Optional: very subtle noise texture for organic feel.

### 1.2 Central Hero Element

- **Material:** Translucent, glass-like. Light passes through and reflects.
- **Edges:** Electric blue/cyan glow (emissive or edge-lit).
- **Structure:** Abstract form (e.g., "A") + two concentric offset rings, same cyan glow.
- **Our enhancement:** Fresnel rim for stronger edge definition. Dynamic emissive intensity that responds to pointer. Subtle subsurface scattering for premium feel.

### 1.3 Light Trails

- **Motion:** Swirling, counter-clockwise, emanating from center toward upper-right.
- **Colors:** Warm golden yellow and orange near center → lime green → lighter yellow at tips.
- **Rendering:** Varying sharpness (some crisp, some blurred) = motion blur, depth.
- **Our enhancement:** Generative trails with richer color ramps. Optional: trail length/opacity tied to scroll or chapter.

### 1.4 Particle Field

- **Density:** Dense, scattered across lower portion.
- **Colors:** Blues, purples, greens, white, light yellow.
- **Variation:** Size, intensity, depth (sharp points vs soft diffused glows).
- **Our enhancement:** Depth-based opacity (fade with distance). Volumetric feel via size falloff. Optional: particles react to pointer proximity.

### 1.5 Curved Lines / Wires

- **Placement:** Below central logo, curving downward.
- **Style:** Metallic sheen, electric blue/cyan glow, intertwining.
- **Our enhancement:** Procedural curves, subtle animation (pulse, flow). Optional: data-driven or narrative-driven paths.

### 1.6 UI Overlay

- **Scroll CTA:** "SCROLL DOWN" — clean sans-serif, light gray/white glow.
- **Nav:** Minimal (WORK, CONTACT). Rounded corners, dark bg, thin light border. White text.
- **Principle:** Understated so 3D remains focal point.
- **Our enhancement:** Sharper typography (e.g., Clash Display, Satoshi). Same restraint.

---

## 2. Color Palette (Implementation-Ready)

### 2.1 CSS Variables (Use in HTML/CSS Overlay)

```css
:root {
  /* Background */
  --color-void: #050508;
  --color-base: #0a0a0f;
  --color-surface: #1a1a24;
  --color-surface-elevated: #242430;

  /* Atmospheric gradient */
  --color-atmo-teal: #0a2f3d;
  --color-atmo-cyan: #0d464f;
  --color-atmo-purple: #0d0a1a;

  /* Emissive / Glow */
  --color-emissive-primary: #00e5ff;
  --color-emissive-secondary: #00d4ff;
  --color-emissive-lime: #00ff88;
  --color-emissive-green: #7fff7f;

  /* Warm accent */
  --color-gold: #f0c050;
  --color-orange: #ff9944;
  --color-yellow: #ffdd44;

  /* Particle palette */
  --color-particle-blue: #4488ff;
  --color-particle-purple: #aa66ff;
  --color-particle-green: #00dd88;
  --color-particle-white: #ffffff;

  /* UI */
  --color-ui-border: rgba(255, 255, 255, 0.12);
  --color-ui-text: #e8e8ec;
  --color-ui-text-bright: #ffffff;
  --color-ui-cta-glow: rgba(0, 229, 255, 0.4);
}
```

### 2.2 Three.js / Shader Color Values

```javascript
// For materials, particles, trails
const COLORS = {
  emissivePrimary: 0x00e5ff,
  emissiveSecondary: 0x00d4ff,
  emissiveLime: 0x00ff88,
  gold: 0xf0c050,
  orange: 0xff9944,
  particleBlue: 0x4488ff,
  particlePurple: 0xaa66ff,
  particleGreen: 0x00dd88,
};
```

### 2.3 Gradient Definitions (Background)

- **Primary gradient:** `linear-gradient(135deg, #0a2f3d 0%, #0d464f 20%, #050508 60%, #0a0a0f 100%)`
- **Enhancement layer:** `radial-gradient(ellipse 80% 50% at 20% 20%, rgba(13, 70, 79, 0.3) 0%, transparent 50%)`
- **Purple depth:** `radial-gradient(ellipse 60% 40% at 80% 80%, rgba(13, 10, 26, 0.4) 0%, transparent 60%)`

---

## 3. Material Specs (Hero Object)

### 3.1 Glass Core

- **Type:** MeshPhysicalMaterial or custom ShaderMaterial.
- **Properties:** `transmission: 1`, `thickness: 0.3–0.5`, `ior: 1.5`, `roughness: 0`, `metalness: 0`.
- **Color:** Near-white with slight cyan tint (#e8f8ff).

### 3.2 Edge Glow (Emissive)

- **Emissive color:** #00e5ff.
- **Emissive intensity:** 0.5–1.0 (animate for reactivity).
- **Fresnel:** Boost emissive at grazing angles for rim effect.

### 3.3 Concentric Rings

- **Material:** Emissive only, or emissive + slight transparency.
- **Color:** Same electric cyan.
- **Animation:** Subtle pulse (0.8–1.2 intensity) or slow rotation.

---

## 4. Light Trail Specs

### 4.1 Color Ramp (Along Trail)

- **Start (center):** #f0c050 (gold) → #ff9944 (orange).
- **Mid:** #00ff88 (lime) → #7fff7f (green).
- **End (tips):** #ffdd44 (yellow) → transparent.

### 4.2 Motion

- Counter-clockwise swirl.
- Variable speed for organic feel.
- Motion blur: render with slight blur or use soft particle size.

### 4.3 Implementation Hints

- Use `Line2` (three/addons) or instanced line geometry.
- Or: particle system with stretched sprites along path.
- Shader: sample color from position along trail (0–1).

---

## 5. Particle System Specs

### 5.1 Distribution

- Dense in lower-left to center.
- Sparse toward edges.
- Vary depth (z) for parallax.

### 5.2 Color Distribution

- ~30% blue (#4488ff)
- ~25% purple (#aa66ff)
- ~25% green (#00dd88)
- ~15% white (#ffffff)
- ~5% yellow (#ffdd44)

### 5.3 Size & Opacity

- Size: 0.5–3 units (world space).
- Opacity: depth-based (farther = softer, more transparent).
- Additive blending for glow.

---

## 6. Dynamic Blossom Theme Config

### 6.1 Single Base Variable

- **CSS:** `:root { --blossom-color: #ffb7c5; }` — change this one line to shift entire blossom palette.
- **Presets:** Apply via `data-theme="spring"` on `<html>` or `document.documentElement.dataset.theme = 'autumn'`.
- **Three.js:** Import `getBlossomColors(theme?)` from `web/src/lib/theme/blossom-theme.ts` and pass to materials.

### 6.2 Preset Definitions

| Preset | Base | Use |
|--------|------|-----|
| spring | #ffb7c5 | Default blossom pink |
| autumn | #e8a87c | Warm amber |
| winter | #e8f4f8 | Cool white/ice |
| custom | — | Override via `--blossom-color` |

### 6.3 Font Stack (Typography)

| Use | Font | Fallback | Weight |
|-----|------|----------|--------|
| Display / Hero | Geist, Satoshi | system-ui | 500–600 |
| Body | Geist, Inter | system-ui | 400 |
| Nav / UI | Same as body | system-ui | 500 |
| Scroll CTA | Same as body | system-ui | 400, uppercase, letter-spacing 0.15em |

**Avoid:** Serif for body, decorative fonts, more than 2 families.

```css
:root {
  --font-display: "Geist", "Satoshi", system-ui;
  --font-body: "Geist", "Inter", system-ui;
}
```

---

## 7. UI Styling

### 7.1 Scroll CTA

- Text: "SCROLL DOWN" or equivalent.
- Font: `var(--font-body)`.
- Color: #e8e8ec with `text-shadow: 0 0 20px rgba(255,255,255,0.3)`.
- Position: Center or bottom-third.

### 7.2 Navigation

- Buttons: Rounded (8px), dark bg (#1a1a24), border 1px solid rgba(255,255,255,0.12).
- Text: White, 14–16px.
- Hover: Slight border brighten or background lift.

### 7.3 Overlay Principle

- All UI: `pointer-events` only on interactive elements.
- Rest: `pointer-events: none` so 3D receives input.
- Z-index: UI above canvas.

---

## 8. Differentiation Checklist (How We Exceed)

When implementing, ensure:

- [ ] Layered atmospheric depth (not flat gradient).
- [ ] Pointer-influenced parallax on hero.
- [ ] Dynamic emissive (responds to interaction).
- [ ] Narrative-driven motion (not just looping).
- [ ] Warm gold accent in palette (luxury contrast).
- [ ] Fresnel rim on glass materials.
- [ ] Depth-based particle opacity.
- [ ] Explicit performance tiers and fallbacks.

---

*Use this guide with 00-MASTER-GUIDE.md Section 1.3 and 04-SHADERS-MATERIALS-GUIDE.md.*
