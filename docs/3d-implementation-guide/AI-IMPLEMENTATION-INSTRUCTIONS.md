# AI Implementation Instructions

> **Use this file when asking an AI to implement the blossom tree 3D experience.** Copy or @reference it.
>
> **TL;DR:** Model: Claude/GPT-4 or Cursor default. @ `prompts/BLOSSOM-TREE-IMPLEMENT.txt` + `13-COMPETITION-IMPLEMENTATION-PROCESS.md`. Skill: `blossom-tree-implementation`.

---

## Which Model to Use

| Task | Recommended Model |
|------|-------------------|
| **Full implementation** | Claude Sonnet 4, GPT-4, or Cursor default |
| **Quick iterations** | Cursor Auto / faster model |
| **Shader/GLSL work** | Claude or GPT-4 (strong at algorithms) |

**Cursor:** Use default or Claude. For complex shader work, prefer a more capable model.

---

## Which Files to Give the AI

### Primary (always)

1. **`@docs/3d-implementation-guide/prompts/BLOSSOM-TREE-IMPLEMENT.txt`**  
   Token-optimized prompt with params, scroll, color, effects.

### Secondary (for context)

2. **`@docs/3d-implementation-guide/13-COMPETITION-IMPLEMENTATION-PROCESS.md`**  
   Step-by-step process, day-by-day phases.

3. **`@docs/3d-implementation-guide/12-SHADER-TOOLS-COMPETITION-GUIDE.md`**  
   Shader libs, particles, post-processing, trails.

### As needed

- **`@docs/3d-implementation-guide/11-TREE-CREATION-RESEARCH.md`** — Tree options (ez-tree, particle-only, free assets).
- **`@docs/3d-implementation-guide/BLOSSOM-TREE-CONCEPT.md`** — Visual direction, palette.
- **`@web/src/lib/theme/blossom-theme.ts`** — Existing theme code.

---

## Which Skill to Enable (Cursor)

**Skill:** `blossom-tree-implementation`

- In Cursor: ensure project skill is active, or @mention it.
- Path: `.cursor/skills/blossom-tree-implementation/SKILL.md`

---

## Implementation Order

1. **Dependencies** — Install `postprocessing`, `@react-three/postprocessing`, `@dgreenheck/ez-tree` (if using ez-tree).
2. **Phase 1** — Canvas, EffectComposer, Bloom, ToneMapping. BlossomScene shell.
3. **Phase 2** — Tree (ez-tree, free GLB, or particle-only).
4. **Phase 3** — Particle petals.
5. **Phase 4** — Mouse parallax, scroll choreography.
6. **Phase 5** — Loading screen.
7. **Phase 6** — Polish, fallbacks.

---

## Required Dependencies (add to web/package.json)

```bash
cd web && npm install postprocessing @react-three/postprocessing
```

**If using ez-tree:**
```bash
npm install @dgreenheck/ez-tree
```

**Optional:** `@funtech-inc/use-shader-fx`, `glsl-noise`, `three.meshline`

---

## Astro Integration

- Canvas must be **client-only**. Use `client:load` or `client:visible` on the component that renders `<Canvas>`.
- Example: `<BlossomScene client:load />` in index.astro.

---

## WebGL Fallback

- Detect WebGL: `const canvas = document.createElement('canvas'); const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');`
- If `!gl`: show static hero (gradient + text), hide 3D. Never leave blank.

---

## Quick Reference

| Item | Value |
|------|-------|
| Parallax LERP | 0.04 |
| Max rotation | 0.14 rad (~8°) |
| Particles | 200–500 (petals), max 800 |
| Bloom intensity | 0.35 |
| Theme | `getBlossomColors()` from blossom-theme.ts |
