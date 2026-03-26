# Citron Bloom engine

Self-contained Three.js module for the Citron ecosystem. It lives under **`engines/citron-bloom`** (not under `src`) so you can copy or symlink this folder into a monorepo as a discrete engine package.

## How to use the engine

1. **Wire the path alias** (same as this repo’s Vite + `tsconfig`):
   - `@citron-bloom-engine` → `engines/citron-bloom` (or your copy of that folder).

2. **Install dependencies** your app needs:
   - Always: `three`, `@citron-systems/citron-ds` (colors/tokens).
   - If you use **`bloom-ui`**: `react`, `react-dom`, `@citron-systems/citron-ui`, plus citron-ui peers (`framer-motion`, `react-error-boundary`, `react-router-dom`).

3. **Build the scene** once you have a `WebGLRenderer` and `Scene`:

   ```ts
   import { createCitronBloomScene } from '@citron-bloom-engine/examples/createCitronBloomScene';

   const bloom = createCitronBloomScene({ renderer, lod: 'high' }); // or 'medium' | 'low'
   scene.add(bloom.root);
   ```

4. **Each frame**, call `bloom.update(delta, elapsed)` and optionally `bloom.setPointerWorld(x, z)` from mouse/touch (world-ish XZ; scale to taste). Use `bloom.setBloomTarget(main, branch?, bud?)` to animate flower opening (0 = closed bud, 1 = full bloom).

5. **Post-processing** (recommended): create a `CitronBloomComposer`, call `init(renderer, scene, camera)` once, then each frame call `composer.render(renderer, scene, camera)` instead of `renderer.render(...)`. Resize with `composer.resize(w, h, dpr)` on window resize.

6. **Optional HUD**: `import { mountBloomHud } from '@citron-bloom-engine/bloom-ui/mountBloomHud'` and pass a DOM node plus callbacks that call `setBloomTarget` on your handle.

**In this Inkblot repo**, `npm run dev` **loads Citron Bloom by default** (with composer + HUD). Use **`?fluid`** for the original raymarched flower. **`?lod=medium`** or **`?lod=low`** tweaks engine quality in dev. Production builds keep the classic experience unless you add **`?citronBloom`** (same as before).

## Layout

| Path | Role |
|------|------|
| `bloom-core` | Design tokens → Three colors, LOD profiles, instanced micro-leaves |
| `bloom-curves` | Catmull / Bezier-style stems, DNA helix sampling, extruded tube spines + GLSL deform |
| `bloom-flora` | **Layered procedural flowers**, multi-head assemblies, smooth **bloom open/close** |
| `bloom-particles` | `GPUComputationRenderer` position field, points display, pointer + attract forces |
| `bloom-postprocess` | Bloom, optional bokeh DOF, screen-space glow, color grading |
| `bloom-ui` | Optional React HUD using `@citron-systems/citron-ds` CSS + `@citron-systems/citron-ui` |
| `examples/createCitronBloomScene.ts` | One-call wiring of spines + leaves + flora + particles |

## Complex flowers and blooming

- **`ProceduralFlower`**: several concentric **layers** of instanced petals (counts, radius, tilt, twist per layer), shader-driven **opening** (`uBloom`), wind curl, rim lighting, and an additive **core** cluster.
- **`FloralAssembly`**: **main stem + branch + bud** each with their own flower head and shared or independent `BloomPhaseController` instances.
- **`BloomPhaseController`**: smooth `setTarget(0–1)` for cinematic open/close; optional pulse for “alive” motion.

Helper entry points:

- `defaultFlowerLayers()` — opinionated 4-ring layout you can clone and tweak.
- `createCitronBloomScene()` — adds **double DNA spines**, a **leaf halo** curve, **floral assembly**, and **GPGPU particles**.

## Usage (programmatic)

```ts
import { createCitronBloomScene } from '@citron-bloom-engine/examples/createCitronBloomScene';
import { CitronBloomComposer } from '@citron-bloom-engine/bloom-postprocess/citronBloomComposer';

const handle = createCitronBloomScene({ renderer, lod: 'high' });
scene.add(handle.root);

function frame(dt: number, elapsed: number) {
  handle.update(dt, elapsed);
  handle.setPointerWorld(pointerX, pointerZ);
}
```

React HUD (optional):

```ts
import { mountBloomHud } from '@citron-bloom-engine/bloom-ui/mountBloomHud';

mountBloomHud(document.getElementById('hud')!, {
  onBloomMore: () => handle.setBloomTarget(1, 0.9, 0.55),
  onBloomLess: () => handle.setBloomTarget(0.05, 0.04, 0.02),
});
```

## Inkblot demo

See **How to use** above: local dev defaults to this engine; **`?fluid`** restores the raymarched flower. For production previews, use **`?citronBloom`** (optional **`=medium`** | **`=low`**).

## Performance

- Tune **`BLOOM_LOD_PROFILES`** in `bloom-core/types.ts` (particle texture size, spine segments, petal cap, DOF).
- Heavy work stays on the GPU: instancing, GPGPU particles, shader deformation.
- Optional **DOF** (`enableDof`) costs an extra depth pass; disabled on `medium` / `low`.

## Integration in another repo

1. Copy `engines/citron-bloom`.
2. Add the same Vite/TS alias: `@citron-bloom-engine` → that folder.
3. Install peers: `three`, `@citron-systems/citron-ds`, and (if you use `bloom-ui`) `react`, `react-dom`, `framer-motion`, `react-error-boundary`, `react-router-dom`, `@citron-systems/citron-ui`.
