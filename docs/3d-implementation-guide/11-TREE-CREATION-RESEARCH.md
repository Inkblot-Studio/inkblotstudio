# Blossom Tree Creation: Research & Approach

> **Purpose:** Which model/approach to use, how the tree is built, and token-optimized prompts for AI-assisted creation.

---

## 0. No External 3D Authoring (No Blender/Spline)

If you don't have skills or access to Blender/Spline, you can still achieve a premium result. Options below require **no separate 3D software**.

### Option A: ez-tree (Procedural, In-Code)

**Package:** `@dgreenheck/ez-tree`  
**Runs:** Fully in browser. No export. No Blender.

```js
import { Tree } from '@dgreenheck/ez-tree';

const tree = new Tree();
tree.options.seed = 12345;
tree.options.trunk.length = 20;
tree.options.branch.levels = 3;
tree.options.leaves.count = 500;
tree.options.leaves.tint = getBlossomColors().glowHex;
tree.options.leaves.type = LeafType.Oak; // or closest to blossom; check ez-tree LeafType enum
tree.generate();
scene.add(tree);
```

- **50+ parameters** for branches, leaves, bark. Curved, tapered, organic.
- **Presets** for deciduous, pine, etc. Tune for blossom-like silhouette.
- **Leaves:** billboard quads, tint with blossom color. Replace leaf texture with petal sprite if needed.
- **Poly count:** 10K–40K typically. Reduce `branch.sections`, `branch.segments` for performance.

**Use when:** You want a real tree shape, zero external tools.

---

### Option B: Free Pre-made Assets

**Sources:** Sketchfab (filter: free, CC0 or CC-BY)

| Model | Triangles | License | Notes |
|-------|-----------|---------|-------|
| CC0 Sakura (ffish.asia) | 700K | CC0 | High-poly; decimate for web |
| Low Poly Cherry Blossom (AstaXI) | 697 | CC-BY | Futuristic neon, very low-poly |
| Cherry Blossom Tree (Viasky) | 284K | CC-BY | Realistic, with textures |

**Workflow:** Download GLB → drop in `public/models/` → load with GLTFLoader. No authoring. Attribution required for CC-BY.

**Use when:** You want a polished tree with zero procedural tuning.

---

### Option C: Concept Pivot — Particle-Only Hero

**No tree geometry.** The hero is a **dense blossom particle cloud** that implies a tree or bloom.

| Element | Implementation |
|---------|----------------|
| **Central form** | Particles spawn in a soft sphere or vertical gradient. Dense in center, sparse at edges. |
| **Motion** | Slow drift, gentle rise. Pointer influence (2%). |
| **Look** | Petal texture, additive blend, bloom. Feels like a "blossom bloom" or "sakura cloud." |
| **Narrative** | Same metaphor (growth, renewal) without literal tree. |

**Pros:** No geometry. Pure particles + shaders. Very achievable. Can look ethereal and premium.  
**Cons:** Different from literal tree. More abstract.

**Use when:** You want to avoid all 3D object creation. Concept becomes "Blossom Bloom" or "Sakura Cloud."

---

### Option D: Concept Pivot — Abstract Geometric

**Replace tree with an abstract form** that's easy to proceduralize:

| Form | Geometry | Material |
|------|----------|----------|
| **Torus knot** | `TorusKnotGeometry` | Glass + emissive |
| **Icosahedron** | `IcosahedronGeometry` | Subdivision + wireframe or glass |
| **Ribbon / curve** | `TubeGeometry` along CatmullRomCurve3 | Emissive, blossom color |
| **Custom spline** | `TubeGeometry` or `Line2` along parametric curve | Glowing trail |

**Narrative:** "Organic intelligence," "flow," "connection" — abstract shapes can carry the same meaning.

**Use when:** You want a clear focal object with minimal code, no assets.

---

### Option E: Shader-Only (Advanced)

**Raymarching** in a fullscreen shader. The "tree" is defined by math (SDFs, noise). No geometry.

- **Pros:** Infinite detail, unique look, no assets.  
- **Cons:** Complex GLSL, performance-sensitive, steep learning curve.

**Use when:** You have shader expertise or want to invest in it.

---

### Recommendation (No External Tools)

| Priority | Choice | Effort |
|----------|--------|--------|
| 1 | **ez-tree** — Real tree, in-code, tunable | Medium (parameter tuning) |
| 2 | **Particle-only** — Pivot to "Blossom Cloud" | Low |
| 3 | **Free Sketchfab** — Download, use | Low (attribution) |
| 4 | **Abstract geometric** — Torus/ribbon | Low |

---

## 1. Avoid: Naive Procedural (Looks Ugly)

**Do not use:** Raw `CylinderGeometry` for trunk, straight cylinder segments for branches, or `SphereGeometry` for blossoms. This produces a cheap, blocky, "obviously procedural" look that clashes with the premium aesthetic.

---

## 2. Recommended: Pre-made Stylized Model (Primary)

**Best path for a breathtaking tree:** A hand-crafted or AI-generated stylized model.

| Source | Approach | Output |
|--------|----------|--------|
| **Spline AI** | Text-to-3D: "stylized cherry blossom tree, abstract, organic branches, glowing pink petals, ethereal, premium, low-poly" | GLB, web-ready |
| **Blender** | Manual: sculpt or model stylized tree, export GLB | Full control |
| **ez-tree / tree.js** | Procedural in tool, export GLB | Organic branches, then customize in Blender |

**Why:** Organic curves, proper silhouette, artist control over shape. Materials applied at runtime with `getBlossomColors()`.

**Asset budget:** 300–600KB GLB (Draco compressed). Load via `GLTFLoader`.

---

## 3. Alternative: Procedural Done Right

If you must avoid external assets, procedural can work **only if** it looks organic:

| Component | What to use | What to avoid |
|-----------|-------------|----------------|
| **Trunk & branches** | [ez-tree](https://github.com/dgreenheck/ez-tree) or [tree.js](https://github.com/GoldSloth/tree.js) — produces curved, tapered, organic geometry | Raw cylinders, straight segments |
| **Blossom clusters** | Billboarded quads with petal texture, or custom 5-petal geometry; emissive + fresnel | Plain spheres |
| **Floating petals** | Textured quads (petal sprite), soft edges, additive blend | Solid circles, harsh edges |

**Critical:** Use a library that generates **curved, tapered** branches. Manual cylinder placement will look stiff and artificial.

---

## 4. Hybrid: Model + Procedural Particles

**Recommended combo:**

- **Tree silhouette:** Pre-made GLB (Spline, Blender, or ez-tree export). Single mesh or few meshes. Glass/emissive material.
- **Floating petals:** Procedural particle system (Points or InstancedMesh) with petal texture. No geometry on the tree itself for petals — the model has blossom *nodes* or *clusters*; particles add atmosphere.

This gives you a polished tree shape with dynamic, performant particles.

---

## 5. Which AI Model for Creation

| Task | Recommended | Why |
|------|-------------|-----|
| **Code (Three.js, R3F)** | Claude Sonnet, GPT-4, or Cursor default | Strong at React/Three.js patterns |
| **3D asset (if pre-made)** | Spline AI, Meshy, Luma | Text-to-3D, organic shapes |
| **Procedural tree code** | Claude, GPT-4 | Good at algorithms (L-system, instancing) |

**For this project:** Use Spline AI (or Blender) to create the tree GLB. Use Cursor/Claude for integration (loading, materials, animation). Spline prompt: *"stylized cherry blossom tree, abstract, organic curved branches, glowing pink petals, ethereal, premium, low-poly, dark background"*.

---

## 6. Token Optimization: Prompt File

Store prompts in a file so AI can `@` reference them instead of pasting long text. Reduces context bloat.

**Location:** `docs/3d-implementation-guide/prompts/BLOSSOM-TREE-IMPLEMENT.txt`

**Usage:** In Cursor, type `@` and select the file, or paste path: `@docs/3d-implementation-guide/prompts/BLOSSOM-TREE-IMPLEMENT.txt` when asking AI to implement the blossom tree.

**Benefits:**
- Single source of truth
- ~200–400 tokens vs ~800+ if pasted inline
- Editable without changing chat history

---

## 7. Visual Summary

**Pre-made model:** Organic silhouette, curved branches, blossom clusters. Materials swapped at runtime.

**Particles:** Float around the tree (textured petal quads), not attached to geometry.

---

## 8. Performance Budget (per plan)

- **Particles:** Max 500–800
- **Blossom nodes:** 50–200
- **Branches:** 6–12 segments
- **Draw calls:** 3–5 (trunk, branches, blossoms, particles, trails)

---

*Use this with 01-SCENE-ARCHITECTURE-GUIDE.md and 07-ASSET-LOADING-GUIDE.md.*
