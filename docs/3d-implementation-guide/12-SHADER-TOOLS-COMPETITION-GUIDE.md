# Guide 12: Shader Libraries & Competition Process

> **Purpose:** Document shader libraries, particle systems, post-processing, and the full process to achieve activetheory-level quality. Use this when building premium 3D effects.

---

## 1. Overview: What You Need to Compete

| Layer | Purpose | Key Libraries |
|-------|---------|----------------|
| **Shaders** | Custom materials, trails, glow | use-shader-fx, glsl-noise, Shadertoy port |
| **Particles** | Trails, petals, atmosphere | GPUComputationRenderer, react-webgl-trails |
| **Post-processing** | Bloom, DOF, vignette, grading | postprocessing, @react-three/postprocessing |
| **Lines/Trails** | Fat lines, ribbons | Line2, three-meshline, drei Line |
| **Noise** | Procedural texture, motion | glsl-noise, webgl-noise |

---

## 2. Shader Libraries

### 2.1 use-shader-fx (React / R3F)

**Package:** `@funtech-inc/use-shader-fx`  
**Docs:** [use-shader-fx](https://threejs3d.com/threejs-projects/projects/funtechinc-use-shader-fx)

Pre-built shader effects for react-three-fiber:

| Category | Effects |
|----------|---------|
| **Effects** | Motion blur, simple blur, wave distortions |
| **Interactions** | Fluid simulations, brush strokes, ripple effects |
| **Noises** | Color strata, marble textures, Perlin noise |
| **Utils** | Blending modes, color grading (duotone, HSV), texture ops |
| **3D** | Morphing particles, 3D wobble |

```bash
npm install @funtech-inc/use-shader-fx
```

**Use for:** Quick motion blur, fluid, noise, color grading without writing GLSL.

---

### 2.2 3ffects

**Repo:** [DavidPeicho/3ffects](https://github.com/DavidPeicho/3ffects)

Materials, shaders, and post-process for Three.js. Smaller ecosystem but useful for custom effects.

---

### 2.3 Drei shaderMaterial

**Docs:** [drei shaderMaterial](https://drei.docs.pmnd.rs/shaders/shader-material)

Create custom ShaderMaterial with R3F:

```jsx
import { shaderMaterial } from '@react-three/drei';

const MyMaterial = shaderMaterial(
  { uTime: 0 },
  `/* vertex */`,
  `/* fragment */`
);

extend({ MyMaterial });
// Use <myMaterial /> in mesh
```

**Use for:** Custom hero materials, emissive, fresnel.

---

### 2.4 Shadertoy → Three.js

**Resources:**
- [Three.js manual: Shadertoy](https://threejs.org/manual/en/shadertoy.html)
- [shadertoy-to-threejs gist](https://gist.github.com/leozamboni/a77b5cb6c26fe6569bf72e64cd65d956)
- [shadertoy2webgl](https://github.com/metaory/shadertoy2webgl) — npm converter

**Conversion steps:**
1. Wrap Shadertoy `mainImage(out vec4 fragColor, in vec2 fragCoord)` in Three.js `main()`.
2. Map uniforms: `iResolution` → viewport, `iTime` → elapsed, `iMouse` → pointer.
3. Use `PlaneGeometry` + `ShaderMaterial` for fullscreen, or apply to mesh.

**Caveat:** Shadertoy shaders are often unoptimized. Start with simple ones (no textures, no cubemaps).

---

## 3. Noise Libraries

### 3.1 glsl-noise (GLSL)

**Package:** `glsl-noise` (works with glslify)  
**Source:** [hughsk/glsl-noise](https://github.com/hughsk/glsl-noise) (from stegu/webgl-noise)

```glsl
#pragma glslify: snoise3 = require(glsl-noise/simplex/3d)
void main() {
  float n = snoise3(position);
  gl_FragColor = vec4(n, n, n, 1.0);
}
```

**Variants:** Simplex 2D/3D/4D, Perlin, Worley (cellular). Use for organic motion, clouds, distortion.

---

### 3.2 webgl-noise (Raw GLSL)

**Repo:** [stegu/webgl-noise](https://github.com/stegu/webgl-noise)

Copy-paste GLSL snippets. No npm. Classic Perlin, Simplex, Worley. Reference for custom shaders.

---

### 3.3 simplex-noise (JavaScript)

**Package:** `simplex-noise`

CPU-side noise for spawning, path generation. ~70M calls/sec. Use for particle init, not per-frame GPU.

```js
import { createNoise2D } from 'simplex-noise';
const noise = createNoise2D();
const value = noise(x, y);
```

---

## 4. Particle & Trail Libraries

### 4.1 GPUComputationRenderer (Three.js Built-in)

**Import:** `three/addons/misc/GPUComputationRenderer.js`

GPGPU: store particle state in RGBA float textures, compute in fragment shader, ping-pong buffers.

| Step | Action |
|------|--------|
| 1 | `new GPUComputationRenderer(sizeX, sizeY, renderer)` |
| 2 | Create initial state textures (position, velocity) |
| 3 | Add variables with fragment shaders |
| 4 | Set dependencies between variables |
| 5 | `gpuCompute.compute()` each frame |
| 6 | Sample output texture in Points/InstancedMesh material |

**Use for:** 10K–500K particles, trails, chains (like Active Theory's neon tubes).

**Example:** [three.js webgpu_compute_particles](https://threejs.org/examples/webgpu_compute_particles.html)

---

### 4.2 GPU Particle System (WebGL2 Transform Feedback)

**Repo:** [senagulen/gpu-particle-system](https://github.com/senagulen/gpu-particle-system)

WebGL2 Transform Feedback, ping-pong buffers. 30K particles @ 120fps on integrated GPU. Temporal trails, bloom.

**Use for:** High particle count without WebGPU.

---

### 4.3 react-webgl-trails

**Package:** `react-webgl-trails`  
**Repo:** [react18-tools/react-webgl-trails](https://github.com/react18-tools/react-webgl-trails)

Lightweight WebGL mouse trail component. TypeScript, Next.js compatible.

**Use for:** Simple pointer trails, not full 3D particle sim.

---

### 4.4 lightest/gpuparticles

**Repo:** [lightest/gpuparticles](https://github.com/lightest/gpuparticles)

THREE.js GPU-driven particles with 3D noise. Actively maintained.

---

## 5. Post-Processing

### 5.1 postprocessing (pmndrs)

**Package:** `postprocessing`  
**Docs:** [pmndrs.github.io/postprocessing](https://pmndrs.github.io/postprocessing/public/docs/)

Effect-based system. `EffectComposer`, `RenderPass`, `EffectPass`.

```js
import { BloomEffect, EffectComposer, EffectPass, RenderPass } from "postprocessing";

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new EffectPass(camera, new BloomEffect()));
// render: composer.render()
```

**Effects:** Bloom, DOF, Vignette, ChromaticAberration, ToneMapping, etc.

```bash
npm install three postprocessing
```

---

### 5.2 @react-three/postprocessing

**Package:** `@react-three/postprocessing`

React wrapper for postprocessing. Integrates with R3F.

```jsx
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

<EffectComposer>
  <Bloom intensity={0.4} luminanceThreshold={0.9} />
  <Vignette />
</EffectComposer>
```

**Use for:** Bloom, DOF, vignette, chromatic aberration in R3F.

---

### 5.3 Custom ShaderPass

Three.js `ShaderPass` for raw GLSL post effects:

```js
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
// Custom shader
composer.addPass(new ShaderPass(myShader));
```

---

## 6. Lines & Trails (Fat Lines)

### 6.1 Line2 (Three.js Addon)

**Import:** `three/addons/lines/Line2.js`, `LineGeometry`, `LineMaterial`

- Arbitrary line width (world units)
- Per-vertex colors (gradients)
- Dashed lines

```js
import { Line2, LineGeometry, LineMaterial } from 'three/addons/lines/Line2.js';

const geometry = new LineGeometry();
geometry.setPositions(positions);
geometry.setColors(colors);
const material = new LineMaterial({ linewidth: 5, vertexColors: true });
const line = new Line2(geometry, material);
```

**Use for:** Trails, ribbons, glowing paths. Update `setPositions`/`setColors` each frame for animated trails.

---

### 6.2 three-meshline

**Package:** `three.meshline`  
**Repo:** [lume/three-meshline](https://github.com/lume/three-meshline)

Mesh-based fat lines. Strip of triangles along path. Per-vertex colors, dashes, transparency.

**Use for:** Thick trails, wireframes, when Line2 isn't enough.

---

### 6.3 Drei Line

**Component:** `<Line />` from `@react-three/drei`

Supports `Line2` and `LineSegments2` via `segments` prop. Vertex alpha colors. Combine with `shaderMaterial` for custom effects.

---

## 7. Full Process: Activetheory-Level Pipeline

### Phase 1: Base Scene

1. Three.js + R3F + Drei.
2. Pre-made GLB tree (Spline/Blender).
3. Materials: `getBlossomColors()`, MeshPhysicalMaterial or custom ShaderMaterial.

### Phase 2: Particles

1. **Floating petals:** Points or InstancedMesh with petal texture. 200–500. Slow drift.
2. **Trails (optional):** GPUComputationRenderer for chain-based trails, or Line2 with updated positions from particle sim.
3. **Noise:** glsl-noise in particle shader for organic motion.

### Phase 3: Glow / Neon Effect

1. Render emissive elements to `RenderTarget`.
2. Blur (Gaussian or two-pass).
3. Composite additively over main scene.
4. Or: use `BloomEffect` from postprocessing with high `luminanceThreshold` to isolate glow.

### Phase 4: Post-Processing

1. `BloomEffect` — intensity 0.3–0.4, threshold 0.9.
2. `ToneMapping` — ACESFilmic.
3. `Vignette` — subtle.
4. Optional: `DepthOfField`, `ChromaticAberration` (restrained).

### Phase 5: Custom Shaders (If Needed)

1. Fresnel rim on tree: `pow(1.0 - dot(normal, viewDir), 2.0)`.
2. Emissive pulse: `emissiveIntensity = base + sin(uTime) * 0.1`.
3. Shadertoy port for unique background or effect.

---

## 8. Dependency Matrix

| Library | Install | Use Case |
|---------|---------|----------|
| postprocessing | `npm i postprocessing` | Bloom, DOF, vignette |
| @react-three/postprocessing | `npm i @react-three/postprocessing` | R3F integration |
| @funtech-inc/use-shader-fx | `npm i @funtech-inc/use-shader-fx` | Quick shader effects |
| glsl-noise | `npm i glsl-noise` | Procedural noise (glslify) |
| three.meshline | `npm i three.meshline` | Fat lines |
| simplex-noise | `npm i simplex-noise` | CPU noise for spawn |

**Built-in (no install):** GPUComputationRenderer, Line2, ShaderPass, ShaderMaterial.

---

## 9. Performance Checklist

- [ ] Tier B/C: disable bloom or reduce intensity.
- [ ] Particles: max 500–800 (blossom), 10K–30K for trails (GPGPU).
- [ ] Post passes: 2–4 max. Each pass = fullscreen draw.
- [ ] Line2: update geometry sparingly; batch updates.
- [ ] Shadertoy ports: profile; many are expensive.

---

## 10. Reference: Active Theory Techniques

| Technique | Implementation |
|-----------|----------------|
| **Trail chains** | GPUComputationRenderer, each pixel = segment, followers lerp to leader |
| **Neon glow** | Render trails → blur RT → additive composite |
| **Hybrid particles** | CPU spawn/life in Web Worker → Float32Array → GPU position compute |
| **DOF** | Depth buffer + blur by depth |
| **Color grading** | Linear burn blend, noise tint |

---

*Use with 04-SHADERS-MATERIALS-GUIDE.md and 09-VISUAL-REFERENCE-ACTIVETHEORY-BEYOND.md.*
