# Guide 13: Competition Implementation Process

> **Purpose:** Step-by-step process to build activetheory-level 3D experience. Every part documented for reproducibility.

---

## 1. Pre-Implementation Checklist

- [ ] Read [00-MASTER-GUIDE.md](00-MASTER-GUIDE.md) Sections 1–8
- [ ] Read [12-SHADER-TOOLS-COMPETITION-GUIDE.md](12-SHADER-TOOLS-COMPETITION-GUIDE.md)
- [ ] Install required: `npm install postprocessing @react-three/postprocessing` (in web/)
- [ ] If ez-tree: `npm install @dgreenheck/ez-tree`
- [ ] Optional: `@funtech-inc/use-shader-fx`, `glsl-noise`, `three.meshline`
- [ ] Canvas: use `client:load` or `client:visible` (Astro client-only)

---

## 2. Phase 1: Project Setup (Day 1)

### 2.1 Scaffold

```
web/
├── src/
│   ├── components/
│   │   └── world/
│   │       ├── BlossomScene.tsx
│   │       ├── BlossomTree.tsx
│   │       ├── ParticlePetals.tsx
│   │       └── TrailEffect.tsx (optional)
│   ├── lib/
│   │   ├── theme/
│   │   │   └── blossom-theme.ts
│   │   └── shaders/
│   │       ├── petal.vert.glsl
│   │       └── petal.frag.glsl
│   └── pages/
│       └── index.astro
```

### 2.2 Canvas + Post-Processing

```jsx
<Canvas gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
  <BlossomScene />
  <EffectComposer>
    <RenderPass />
    <Bloom intensity={0.35} luminanceThreshold={0.9} luminanceSmoothing={0.5} />
    <ToneMapping />
  </EffectComposer>
</Canvas>
```

### 2.3 Theme

Ensure `getBlossomColors()` and `BLOSSOM_THEMES` are wired. CSS `--blossom-color` in global.css.

---

## 3. Phase 2: Tree Asset (Day 2)

### 3.1 Create or Source Tree

**Option A — Spline AI:**  
Prompt: "stylized cherry blossom tree, abstract, organic curved branches, glowing pink petals, ethereal, premium, low-poly, dark background"  
Export GLB. Target < 500KB.

**Option B — Blender:**  
Model stylized tree. Export GLB with Draco.

**Option C — ez-tree (no Blender):**  
`npm i @dgreenheck/ez-tree`. Generate in-code: `new Tree()`, set options, `tree.generate()`, `scene.add(tree)`. No export. See [11-TREE-CREATION-RESEARCH.md](11-TREE-CREATION-RESEARCH.md) §0.

### 3.2 Load Tree

```jsx
import { useGLTF } from '@react-three/drei';

function BlossomTree() {
  const { scene } = useGLTF('/models/blossom-tree.glb');
  const colors = getBlossomColors();
  // Traverse and replace materials with emissive
  scene.traverse((child) => {
    if (child.isMesh) {
      child.material.emissive.setHex(colors.glowHex);
      child.material.emissiveIntensity = 0.6;
    }
  });
  return <primitive object={scene} />;
}
```

### 3.3 Materials

- Trunk/branches: MeshPhysicalMaterial, transmission, or custom glass shader.
- Blossom clusters: emissive, `getBlossomColors().glowHex`.

---

## 4. Phase 3: Particle Petals (Day 3)

### 4.1 Approach

Use `Points` with `PointsMaterial` and custom texture (petal sprite), or `InstancedMesh` with small quad + texture.

### 4.2 Spawn

- 200–500 particles.
- Positions: random in sphere or box around tree.
- Use `simplex-noise` for organic distribution if desired.

### 4.3 Update Loop

```js
useFrame((state, delta) => {
  // Slow drift: position += velocity * delta
  // Optional: pointer influence (lerp toward pointer, 2% strength)
});
```

### 4.4 Material

- `PointsMaterial` with `map` = petal texture (soft edge, transparent).
- `sizeAttenuation: true`, `transparent: true`, `blending: AdditiveBlending` for glow.
- Color: `getBlossomColors().petalHex`.

### 4.5 Petal Texture (No Asset Needed)

- **Option A:** 16x16 PNG with radial gradient (white center, transparent edges). Create in Figma/Canva or canvas API.
- **Option B:** Skip texture — use `PointsMaterial` with `size` and `color` only. Add texture later for polish.
- **Option C:** Use `THREE.CanvasTexture` with programmatic gradient (circle, radial fade).

---

## 5. Phase 4: Trails (Optional, Day 4)

### 5.1 When to Add

Only if you want activetheory-style swirling light trails. Adds complexity.

### 5.2 Approach A — Line2

- Store N points per trail.
- Update: shift points, add new head position from parametric curve (e.g. spiral).
- `LineGeometry.setPositions()`, `setColors()` each frame.
- Material: `LineMaterial` with `vertexColors: true`, gradient along trail.

### 5.3 Approach B — GPUComputationRenderer

- Texture: each pixel = particle in chain.
- Fragment shader: head moves along path; followers lerp to previous.
- Output drives `InstancedMesh` or `Points` positions.
- See [12-SHADER-TOOLS-COMPETITION-GUIDE.md](12-SHADER-TOOLS-COMPETITION-GUIDE.md) §4.1.

### 5.4 Glow Composite

- Render trails to `RenderTarget`.
- Blur (e.g. `UnrealBloomPass` on trails only, or custom blur).
- Composite additively over main scene.

---

## 6. Phase 5: Mouse Interaction (Day 5)

### 6.1 Parallax

- `useFrame` + pointer NDC from `useThree` or global state.
- Tree `rotation.x/y` lerp toward target. `MAX_ROTATION = 0.14`, `LERP = 0.04`.
- Idle: after 4s no input, target → (0,0).

### 6.2 Particle Influence

- Optional: particles drift 2% toward pointer. Subtle.

### 6.3 Touch

- Disable parallax when `pointerType === 'touch'`.

---

## 7. Phase 6: Scroll Choreography (Day 6)

### 7.1 Scroll State

- Listen to `window.scrollY`, normalize to 0–1.
- Throttle with `requestAnimationFrame`.

### 7.2 Camera Keyframes

| Scroll | Camera pos | Tree scale |
|--------|------------|------------|
| 0–0.15 | (0, 0, 8) | 1 |
| 0.15–0.4 | Arc right | 1 → 0.6 |
| 0.4–0.7 | Continue | 0.6 |
| 0.7–1 | Return center | 0.6 |

Interpolate with `easeInOutCubic`.

### 7.3 Reduced Motion

- `prefers-reduced-motion` → instant camera jumps at boundaries.

---

## 8. Phase 7: Loading Screen (Day 7)

### 8.1 Layout

- Blossom icon, "Inkblot Studio", progress bar + %.
- Background: same gradient as hero.

### 8.2 Progress Source

- `LoadingManager` from Three.js. Pass to `GLTFLoader`, `TextureLoader`.
- `onProgress` → update state → progress bar.

### 8.3 Timing

- Min display 800ms. Fade out 400ms when progress = 100%.

---

## 9. Phase 8: Polish & Performance (Day 8)

### 9.1 Effects Restraint

- Bloom: 0.3–0.4 intensity.
- Particles: cap at 500–800.
- Trails: 1–2 max.

### 9.2 Tier B/C

- Reduce bloom or disable.
- Fewer particles.
- Simpler materials.

### 9.3 Metrics

- LCP < 2.5s.
- FPS > 30 sustained. Degrade if below.

---

## 10. Debugging Checklist

- [ ] Tree loads without errors.
- [ ] Particles visible, drifting.
- [ ] Bloom not overwhelming.
- [ ] Pointer parallax smooth, not twitchy.
- [ ] Scroll camera interpolates correctly.
- [ ] Loading screen shows progress, fades out.
- [ ] `getBlossomColors()` applied to all emissive elements.
- [ ] Touch: no parallax, tap works.

---

## 11. File Reference Map

| Task | File / Guide |
|------|---------------|
| Shader libs | 12-SHADER-TOOLS-COMPETITION-GUIDE.md |
| Tree creation | 11-TREE-CREATION-RESEARCH.md |
| Mouse/scroll | 02-INTERACTION-INPUT-GUIDE.md, 05-CREATIVE-MOTION-GUIDE.md |
| Loading | 10-LOADING-SCREEN-GUIDE.md |
| Theme | BLOSSOM-TREE-CONCEPT.md, web/src/lib/theme/blossom-theme.ts |
| Post-processing | 04-SHADERS-MATERIALS-GUIDE.md, 12-SHADER-TOOLS-COMPETITION-GUIDE.md §5 |

---

*Use with 12-SHADER-TOOLS-COMPETITION-GUIDE.md for library details.*
