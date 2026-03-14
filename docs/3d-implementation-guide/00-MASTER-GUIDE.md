# Master Implementation Guide: Breathtaking 3D Web Experience with WebGL, Three.js & WebGPU

> **Purpose:** A comprehensive, AI-incorporatable guide for building a super creative, breathtaking 3D UI flow. Use this document as the single source of truth when implementing immersive web experiences. Every section is designed to be actionable, with explicit patterns, constraints, and decision points.

**Document Version:** 1.0  
**Target Stack:** WebGL 2 / Three.js / WebGPU (experimental)  
**Line Count Target:** 2000+  
**Last Updated:** 2025-03

---

## Table of Contents

1. [Vision & Creative Philosophy](#1-vision--creative-philosophy)
2. [Technology Stack Deep Dive](#2-technology-stack-deep-dive)
3. [Scene Architecture & Composition](#3-scene-architecture--composition)
4. [Camera & Viewport Systems](#4-camera--viewport-systems)
5. [3D UI Flow & State Machine](#5-3d-ui-flow--state-machine)
6. [Interaction Layers & Input Handling](#6-interaction-layers--input-handling)
7. [Materials, Lighting & Shaders](#7-materials-lighting--shaders)
8. [Performance & Optimization](#8-performance--optimization)
9. [Asset Pipeline & Loading](#9-asset-pipeline--loading)
10. [Accessibility & Fallbacks](#10-accessibility--fallbacks)
11. [Responsive & Adaptive Quality](#11-responsive--adaptive-quality)
12. [Code Patterns & Integration](#12-code-patterns--integration)
13. [WebGPU-Specific Implementation](#13-webgpu-specific-implementation)
14. [Debugging, Profiling & Observability](#14-debugging-profiling--observability)
15. [Deployment & Production Checklist](#15-deployment--production-checklist)

---

# 1. Vision & Creative Philosophy

## 1.1 Core Creative Intent

The goal is to deliver a **luxury, future-defining interactive experience** that communicates control, intelligence, and execution speed. Every pixel and every motion must reinforce the narrative: this is premium, this is innovative, this is trustworthy.

### Design Pillars

| Pillar | Description | Implementation Implication |
|--------|-------------|---------------------------|
| **Cinematic Purpose** | Every motion reinforces narrative meaning. No decorative animation for its own sake. | Use motion to reveal information, guide attention, or signal state. |
| **Premium Minimalism** | Avoid noisy effects that dilute authority. Restraint is luxury. | Limit concurrent effects; prefer subtle gradients and soft shadows over flashy particles. |
| **Performance by Design** | Interaction ambition scales by device capability. | Implement tiered quality; never block core content on 3D. |
| **Accessibility Parity** | Core communication and conversion never depend on advanced graphics. | Always provide equivalent content and CTAs in fallback mode. |

### Emotional Targets by Section

- **Hero:** Awe, curiosity, "this is different."
- **Capability Journey:** Understanding, "I get what they do."
- **Proof / Case Study:** Trust, "they've done this before."
- **Conversion:** Confidence, "I want to talk to them."

## 1.2 Experience Principles for AI Implementation

When implementing, apply these principles at every decision point:

1. **Reveal, Don't Distract** — Interaction must reveal meaning. If a 3D element doesn't add narrative value, remove it or simplify.
2. **One Motion, One Intention** — Each motion sequence supports exactly one narrative intention: awe, understanding, trust, or action.
3. **Responsive on Mainstream Devices** — Target enterprise desktops and mid-tier mobile. Never assume high-end GPUs.
4. **Graceful Degradation** — Every 3D feature has a defined fallback. Fallbacks preserve message order, CTA placement, and proof visibility.
5. **Content First** — HTML structure and copy are primary. 3D enhances; it never replaces.

## 1.3 Visual Reference: Activetheory Analysis & Beyond

> **Benchmark:** activetheory.net sets a high bar. Our goal is to match and exceed it. Below: what they do, what we adopt, and how we go further.

### Activetheory Visual Breakdown (Reference)

| Element | Their Approach | Our Adoption |
|---------|----------------|--------------|
| **Background** | Deep black + atmospheric teal/cyan gradient (#0a2f3d → #0d464f) top-left fading to void | Adopt + deepen: richer gradient layers, subtle noise for depth |
| **Central hero** | Translucent glass-like "A", electric blue/cyan edge-lit, concentric glowing rings | Adopt: glass-metal hybrid, emissive edges, layered rings |
| **Light trails** | Swirling streaks, gold→orange→lime→yellow color transitions, motion blur | Adopt: generative trails with richer color ramps |
| **Particles** | Dense field, blues/purples/greens/white, varied size and depth | Adopt: volumetric feel, depth-based opacity |
| **Curved lines** | Metallic sheen, cool electric blue, intertwining geometry | Adopt: procedural curves, subtle animation |
| **UI** | "SCROLL DOWN" with light glow; minimal nav (WORK, CONTACT) with thin borders | Adopt: same restraint, sharper typography |

### How We Exceed (Differentiation)

| Dimension | Activetheory | Our Target |
|-----------|--------------|------------|
| **Depth** | Flat gradient | Layered atmospheric depth, subtle volumetric fog, parallax layers |
| **Interactivity** | Passive scroll | Pointer-influenced parallax, reactive glow, hover states on hero |
| **Color story** | Cool cyan/green dominant | Broader palette: cyan primary + warm gold accents for luxury contrast |
| **Motion** | Looping trails | Narrative-driven motion: intro sequence, chapter-specific choreography |
| **Materials** | Emissive + glass | Add: subtle subsurface, fresnel rim, dynamic emissive intensity |
| **Performance** | Unknown | Explicit tiered quality, adaptive degradation, LCP budget |

### Material Language (Refined)

- **Primary:** Glass-metal hybrid with emissive edge-lit accents. Translucent core, crisp glow on edges.
- **Avoid:** Flat matte, noisy gradients, over-saturated colors, static emissive.
- **Accent:** Electric cyan (#00e5ff) primary; warm gold (#f0c050) for contrast and luxury.

### Color Posture (Activetheory-Informed)

- **Background base:** Deep void black (#050508, #0a0a0f).
- **Atmospheric gradient:** Dark teal/cyan (#0a2f3d, #0d464f) fading to black. Add second layer: subtle purple (#0d0a1a) for depth.
- **Emissive primary:** Electric cyan (#00e5ff, #00d4ff).
- **Emissive secondary:** Lime/green (#7fff7f, #00ff88) for trails and particles.
- **Warm accent:** Gold (#f0c050), orange (#ff9944) for trail heads and highlights.
- **Particle palette:** Blues (#4488ff), purples (#aa66ff), greens (#00dd88), white (#ffffff).
- **Surface/UI:** Subtle elevation (#1a1a24), thin light borders (#ffffff20).
- **Text:** High legibility (#e8e8ec, #ffffff), subtle glow for CTAs.

### Typography Behavior

- Strong hierarchy: H1 > H2 > body > caption.
- Stable readability over animated backgrounds: ensure contrast ratio ≥ 4.5:1.
- Avoid text directly on busy 3D; use overlays or dedicated text zones.

### Motion Language

| Motion Type | Duration | Easing | Use Case |
|-------------|----------|--------|----------|
| Intro sequences | 1200–2500ms | ease-out | Hero load, section entry |
| Section transitions | 450–900ms | ease-in-out | Camera moves, scene changes |
| Microinteractions | 120–280ms | ease-out | Hover, click, toggle |
| Idle loops | 4000–8000ms | linear/sine | Ambient motion |

**Rule:** Avoid abrupt acceleration. Use physically plausible interpolation (e.g., GSAP ease-out-expo, custom cubic-bezier).

### Effects Restraint (Professional Feel)

Mindful of effects. Do not overdo. Super professional.

| Effect | Use | Avoid |
|--------|-----|-------|
| Bloom | Subtle (intensity 0.3–0.4). Only on blossom glow. | Strong bloom, multiple bloom passes |
| Particles | Sparse. Max 500–800. Slow drift. | Dense clouds, fast motion |
| Trails | 1–2 subtle trails. Low opacity. | Many overlapping trails |
| Parallax | 8° max rotation. Strong easing. | Twitchy, high-amplitude |
| Idle motion | 4–8s loops. Barely perceptible. | Constant obvious motion |
| Post-FX | Tone mapping + optional subtle vignette. | Chromatic aberration, heavy grain |

---

# 2. Technology Stack Deep Dive

## 2.1 WebGL vs WebGPU: When to Use What

### WebGL 2 (Primary Path)

- **Use for:** Production rendering. Universal support. Stable API.
- **Strengths:** Mature, well-documented, Three.js built on it.
- **Limitations:** Single-threaded, limited compute, older pipeline model.

### WebGPU (Experimental Path)

- **Use for:** Future-proofing, compute-heavy effects, advanced features.
- **Strengths:** Modern pipeline, compute shaders, better multi-threading.
- **Limitations:** Limited browser support (Chrome, Edge; Safari experimental). Requires feature detection and fallback.

### Decision Matrix for AI

| Scenario | Recommendation |
|----------|----------------|
| Production site, broad compatibility | WebGL 2 via Three.js |
| Experimental / internal demos | WebGPU optional path |
| Compute-heavy post-processing | WebGPU if available, else WebGL fallback |
| Mobile-first | WebGL 2 only |

### Feature Detection Pattern

```javascript
// Pseudo-code for AI: Always gate WebGPU behind detection
async function getRenderer() {
  if (typeof navigator.gpu !== 'undefined') {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) return 'webgpu';
    } catch (e) { /* fallback */ }
  }
  return 'webgl2';
}
```

## 2.2 Three.js Ecosystem

### Core Dependencies

- **three** — Core 3D library. Use r150+ for best WebGL 2 support.
- **@react-three/fiber** — React renderer for Three.js. Declarative scene graph.
- **@react-three/drei** — Helpers: OrbitControls, Environment, Html, etc.
- **@react-three/postprocessing** — Post-processing effects (optional, budget-aware).

### When to Use React Three Fiber (R3F)

- **Use R3F when:** Building React apps; need declarative scene updates; want hooks (useFrame, useThree).
- **Use vanilla Three.js when:** Non-React stack; maximum control; minimal bundle size.

### Bundle Size Considerations

| Package | Approx. Size (gzip) | Notes |
|---------|---------------------|-------|
| three | ~150KB | Core only |
| @react-three/fiber | ~15KB | Thin wrapper |
| @react-three/drei | ~50KB | Tree-shakeable; import only what you need |

**Rule:** Lazy-load 3D runtime. Do not block initial HTML/CSS/JS for 3D.

## 2.3 Build & Tooling

- **Bundler:** Vite recommended. Supports dynamic imports and code splitting.
- **TypeScript:** Use for type safety. Three.js has good type definitions.
- **Linting:** Enforce no unused imports (especially in drei) to keep bundle small.

---

# 3. Scene Architecture & Composition

## 3.1 Scene Graph Philosophy

Treat the 3D scene as a **single continuous world** with logical chapters. Avoid multiple isolated scenes; prefer one scene with visibility/position toggles for narrative flow.

### Hierarchy Pattern

```
Scene
├── World (root container)
│   ├── Chapter_Hero
│   │   ├── HeroObject
│   │   ├── AmbientElements
│   │   └── Lights_Hero
│   ├── Chapter_Capability
│   │   ├── TunnelGeometry
│   │   ├── NarrativeNodes
│   │   └── Lights_Capability
│   ├── Chapter_Proof
│   │   ├── CaseStudyMesh
│   │   └── Lights_Proof
│   └── Chapter_Conversion
│       ├── PreCommitModule
│       └── Lights_Conversion
├── PostProcessing (optional)
└── UIOverlay (HTML/CSS layer)
```

### Visibility & LOD by Chapter

- Only one chapter is "active" at a time for heavy computation.
- Inactive chapters: reduce update frequency or hide expensive objects.
- Use `visible` and `matrixAutoUpdate` to cull off-screen content.

## 3.2 Layer System

Three.js supports 32 layers (0–31). Use them for selective rendering (e.g., UI in 3D, reflections).

| Layer | Purpose |
|-------|---------|
| 0 | Default; main world geometry |
| 1 | Hero object (optional separate pass) |
| 2 | UI elements in 3D space |
| 3 | Reflection/refraction objects |

### Example: Setting Layers

```javascript
// Pseudo-code for AI
object.layers.set(1);
camera.layers.set(0);
camera.layers.enable(1); // Render both 0 and 1
```

## 3.3 Coordinate System & Units

- **Units:** 1 unit = 1 meter (convention). Scale assets accordingly.
- **Y-up:** Three.js uses Y-up. Match exported models.
- **Origin:** Center hero at (0, 0, 0). Camera and world move around narrative focus.

## 3.4 Grouping for Animation

Group objects that move together. Example: Hero object + its glow = one Group. Animate the group, not individual children, when possible.

---

# 4. Camera & Viewport Systems

## 4.1 Camera Types

### PerspectiveCamera (Primary)

- **Use for:** All main 3D views. Mimics human vision.
- **Key params:** `fov` (45–60°), `aspect`, `near` (0.1), `far` (1000+).
- **Rule:** Match `aspect` to viewport; update on resize.

### OrthographicCamera

- **Use for:** UI overlays in 3D, technical diagrams, 2.5D effects.
- **Key params:** `left`, `right`, `top`, `bottom`, `near`, `far`.

## 4.2 Camera Choreography

### Scroll-Driven Camera

- Map scroll position (0–1) to camera position and target.
- Use smooth interpolation (lerp) to avoid jitter.
- Snap points: define key scroll values (e.g., 0, 0.25, 0.5, 0.75, 1) for narrative beats.

### Keyframe Pattern

```javascript
// Pseudo-code for AI: Scroll-to-camera mapping
const keyframes = [
  { scroll: 0,   position: [0, 0, 8],   target: [0, 0, 0] },
  { scroll: 0.25, position: [2, 1, 6],   target: [0, 0, 0] },
  { scroll: 0.5,  position: [0, 2, 4],   target: [0, 0, 0] },
  { scroll: 0.75, position: [-2, 1, 6],   target: [0, 0, 0] },
  { scroll: 1,    position: [0, 0, 8],   target: [0, 0, 0] },
];
// Interpolate between keyframes based on scroll
```

### Blossom Tree: Camera Keyframes

| Scroll | Camera position | Target | Tree / Scene |
|--------|-----------------|--------|--------------|
| 0–0.15 | (0, 0, 8) | (0, 0, 0) | Tree visible, particles active |
| 0.15–0.4 | Arc right, slight rise. Ease-in-out. | (0, 0, 0) | Tree scales 1 → 0.6, fades. Capability content |
| 0.4–0.7 | Continue arc, different angle | (0, 0, 0) | Proof / case study scene |
| 0.7–1 | Return toward center, pull back | (0, 0, 0) | Conversion / CTA section |

### Easing for Camera

- Use `ease-in-out` or custom cubic-bezier for camera moves.
- Avoid linear; it feels robotic.

## 4.3 Viewport & Resize Handling

- Listen to `window.resize` or `ResizeObserver`.
- Update `camera.aspect`, `camera.updateProjectionMatrix()`, and `renderer.setSize()`.
- Update any effect composer or post-processing passes.

## 4.4 Pixel Ratio & Quality

- `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` — Cap at 2 for performance.
- Adaptive: reduce pixel ratio when FPS drops (see Performance section).

---

# 5. 3D UI Flow & State Machine

## 5.1 State Machine Model

Define explicit states for the experience. Transitions are triggered by user input or scroll.

### Core States

| State | Description | Triggers |
|-------|-------------|----------|
| `idle` | Passive; post-load or post-interaction calm | Timeout, scroll stop |
| `engaged` | User actively controlling (pointer, scroll) | Pointer move, scroll |
| `guided` | System-controlled narrative sequence | Scroll, auto-play |
| `fallback` | Non-3D equivalent mode | Capability check, user pref |

### State Transition Rules

- `idle` → `engaged`: On first pointer move or scroll.
- `engaged` → `idle`: After N seconds of no input (e.g., 3s).
- `guided` → `engaged`: User interrupts (scroll, click).
- Any → `fallback`: Device tier C, reduced-motion, or WebGL failure.

## 5.2 Chapter-Based Narrative Flow

### Chapter Definition

Each chapter has:

- `id`: Unique string (e.g., `hero`, `capability`, `proof`, `conversion`).
- `scrollRange`: [start, end] normalized 0–1.
- `cameraKeyframes`: Position/target at start and end.
- `content`: Copy, CTAs, proof elements.
- `interactions`: List of interactive elements and their behaviors.

### Scroll-to-Chapter Mapping

```javascript
// Pseudo-code for AI
function getChapterAtScroll(scroll) {
  const chapters = [
    { id: 'hero', range: [0, 0.2] },
    { id: 'capability', range: [0.2, 0.6] },
    { id: 'proof', range: [0.6, 0.85] },
    { id: 'conversion', range: [0.85, 1] },
  ];
  return chapters.find(c => scroll >= c.range[0] && scroll < c.range[1]);
}
```

### Snap Points

- Optional: snap scroll to chapter boundaries for cleaner pacing.
- Use `scroll-snap` CSS or custom JS scroll behavior.

## 5.3 CTA Integration

- **Primary CTA:** Visible in hero after intro (or immediately in fallback).
- **Secondary CTA:** After second capability reveal.
- **Contextual CTA:** At each chapter (e.g., "See this in a client outcome").
- **Conversion CTA:** In final chapter; always above fold in fallback.

**Rule:** Same CTA sequence across all tiers. Never hide conversion in 3D-only state.

---

# 6. Interaction Layers & Input Handling

## 6.1 Input Types

| Input | Use Case | Handling |
|-------|----------|----------|
| Pointer (mouse/touch) | Parallax, hover, click | `pointermove`, `pointerdown`, `pointerup` |
| Scroll | Camera progression, chapter change | `scroll` (passive), `wheel` (prevent default only if needed) |
| Keyboard | Accessibility, shortcuts | `keydown` for skip, next, prev |
| Resize | Viewport update | `resize`, `ResizeObserver` |

## 6.2 Raycasting for 3D Picking

- Use `Raycaster` and `Mouse` (or touch coords) to intersect objects.
- Set `raycaster.layers` to match interactive objects.
- Filter by `object.userData.interactive === true` or similar.

### Performance

- Throttle raycasting to 60fps or less (e.g., in `useFrame`).
- Use simple bounding volumes for complex meshes when possible.

## 6.3 Pointer-Influenced Parallax (Hero)

- Map pointer position (normalized -1 to 1) to object rotation and light position.
- Apply easing (lerp) so response feels smooth, not twitchy.
- After interaction, settle to low-amplitude idle (reduce rotation range).

### Example Parallax Mapping

```javascript
// Pseudo-code: pointer to rotation
const rotationX = lerp(currentRotationX, targetRotationX, 0.05);
const rotationY = lerp(currentRotationY, targetRotationY, 0.05);
// target from pointer: (pointerX - 0.5) * maxAngle
```

## 6.4 Hover & Click Feedback

- Hover: subtle scale (1 → 1.05), emissive boost, or outline.
- Click: quick scale down (0.95) then back. Duration 120–200ms.
- Ensure feedback is visible (contrast, motion) for accessibility.

## 6.5 Scroll Behavior

- **Passive listeners:** Use `{ passive: true }` for scroll to avoid blocking.
- **Throttle:** Update camera/state at most 60fps.
- **Respect reduced-motion:** If `prefers-reduced-motion: reduce`, use instant jumps instead of smooth scroll-driven animation.

## 6.6 Touch Considerations

- Larger hit targets (min 44x44px equivalent in 3D).
- No hover on touch; use tap for activation.
- Prevent `touchmove` default only when necessary (e.g., horizontal swipe for carousel).

---

# 7. Materials, Lighting & Shaders

## 7.1 Material Choices

| Material | Use Case | Performance |
|----------|----------|-------------|
| MeshStandardMaterial | Default for PBR; good balance | Medium |
| MeshPhysicalMaterial | Glass, clearcoat, sheen | Heavier |
| MeshBasicMaterial | Unlit, UI, fallback | Lightest |
| ShaderMaterial | Custom effects | Variable |

### Tier-Based Material Simplification

- **Tier A:** Physical materials, custom shaders.
- **Tier B:** Standard materials, no custom shaders.
- **Tier C:** Basic materials or pre-rendered.

## 7.2 Lighting Setup

### Three-Point Lighting (Classic)

- **Key:** Main light. Position front-side. Intensity 1.
- **Fill:** Softer, opposite side. Intensity 0.3–0.5.
- **Rim:** Back light for edge definition. Intensity 0.2–0.4.

### Ambient

- `AmbientLight` with low intensity (0.2–0.4) to avoid pure black shadows.

### Dynamic vs Baked

- Prefer baked lighting for static geometry when possible.
- Use dynamic lights sparingly (1–3 per scene).

## 7.3 Custom Shaders

- Use for: unique hero effect, distortion, glow.
- Keep simple: avoid branching, limit texture fetches.
- Provide fallback: if shader compile fails, use MeshBasicMaterial.

### GLSL Best Practices

- Use `precision highp float` for quality.
- Avoid loops with variable iterations.
- Use `#define` for constants; some minifiers optimize better.

## 7.4 Post-Processing

- **Bloom:** Subtle for luxury glow. Radius small, strength low.
- **Tone mapping:** ACESFilmic or similar for cinematic look.
- **Vignette:** Optional, subtle.
- **Rule:** Post-processing is expensive. Disable on Tier B/C or when FPS drops.

---

# 8. Performance & Optimization

## 8.1 Performance Budgets

### Core Web Vitals (p75)

| Metric | Target |
|--------|--------|
| LCP | ≤ 2.5s |
| INP | ≤ 200ms |
| CLS | ≤ 0.1 |

### Resource Budgets (First Load)

| Resource | Budget (gzip) |
|----------|---------------|
| Critical JS | ≤ 250KB |
| Total JS (initial) | ≤ 450KB |
| CSS | ≤ 90KB |
| Hero media | ≤ 900KB |
| Request count | ≤ 55 |

### Runtime Budgets

- Main-thread blocking > 50ms: minimal.
- Animation: sustain ~60fps on Tier A.
- Scene init to first interaction: ≤ 1.2s.

## 8.2 Adaptive Quality Scaling

### Quality Tiers

| Tier | Geometry | Materials | Post-FX | Pixel Ratio |
|------|----------|-----------|---------|-------------|
| A | Full | Physical | Bloom, tone | 2 |
| B | Reduced | Standard | Tone only | 1.5 |
| C | Minimal/Video | Basic/None | None | 1 |

### FPS-Based Degradation

- Monitor FPS over sliding window (e.g., 1s).
- If FPS < 30 for 2s: drop one quality level.
- If FPS < 20: drop to Tier C or fallback.

### Degradation Order

1. Disable post-processing (bloom, etc.).
2. Reduce pixel ratio.
3. Simplify materials (Physical → Standard → Basic).
4. Reduce geometry (LOD, hide decorative).
5. Switch to video/static fallback.

## 8.3 Geometry Optimization

- **LOD:** Use `THREE.LOD` for distant objects. 2–3 levels.
- **Instancing:** Use `InstancedMesh` for repeated geometry (particles, trees).
- **Decimation:** Reduce polygon count for Tier B/C.
- **Frustum culling:** Automatic in Three.js; ensure objects have correct `boundingSphere`/`boundingBox`.

## 8.4 Texture Optimization

- **Format:** WebP, AVIF with fallback. Compress.
- **Size:** 2048 max for hero; 1024 for secondary. 512 for small.
- **Mipmaps:** Enable for distant objects.

## 8.5 Object Pooling

- Reuse geometries and materials. Avoid creating/destroying in animation loop.
- Use `dispose()` only when object is permanently removed.

## 8.6 Memory Management

- Dispose of geometries, materials, textures when no longer needed.
- Remove event listeners on unmount.
- Clear `renderer.renderLists` if using custom passes.

---

# 9. Asset Pipeline & Loading

## 9.1 Asset Types

| Type | Format | Notes |
|------|--------|-------|
| Models | GLB/GLTF | Prefer binary GLB. Draco for compression. |
| Textures | WebP, PNG | WebP primary; PNG fallback. |
| Video | MP4, WebM | For fallback loops. |
| Audio | Optional | For ambient; lazy-load. |

## 9.2 Loading Strategy

- **Critical:** Hero object, hero texture. Preload.
- **Deferred:** Other chapters. Load when chapter is near viewport.
- **Lazy:** Case study details, video. Load on interaction.

### LoadingManager

Use Three.js `LoadingManager` for progress and error handling.

```javascript
// Pseudo-code for AI
const manager = new THREE.LoadingManager();
manager.onProgress = (url, loaded, total) => { /* update progress UI */ };
manager.onError = (url) => { /* fallback */ };
const loader = new GLTFLoader(manager);
```

## 9.3 Preloading

- Add `<link rel="preload">` for critical 3D assets.
- Use `fetch` with `priority: 'high'` for key resources.

## 9.4 Error Handling

- If model fails to load: show placeholder (simple geometry) or fallback to 2D.
- Never leave user with broken 3D or blank space.

---

# 10. Accessibility & Fallbacks

## 10.1 prefers-reduced-motion

- **Check:** `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
- **Behavior:** Disable or drastically reduce motion. Use instant transitions. Consider static images.

## 10.2 Keyboard Access

- All interactive 3D elements must be reachable via keyboard.
- Use `tabIndex`, `role`, and `aria-*` for focusable 3D UI.
- Provide "Skip to content" and "Skip 3D" links.

## 10.3 Screen Readers

- Ensure critical content is in DOM, not only in 3D.
- Use `aria-live` for dynamic updates.
- Provide text alternatives for 3D narrative (e.g., "Scene 2: Capability overview").

## 10.4 Contrast & Legibility

- Text over 3D: ensure contrast ratio ≥ 4.5:1.
- Use solid overlays or blur behind text when needed.

## 10.5 Fallback Modes

### Tier C Fallback

- Replace 3D with: pre-rendered video loop, or static high-fidelity image, or 2D layered motion.
- Preserve: message order, CTA placement, proof visibility.

### WebGL Failure

- Detect WebGL support on init.
- If unsupported: show 2D experience immediately. No broken canvas.

---

# 11. Responsive & Adaptive Quality

## 11.1 Device Tier Detection

| Tier | Criteria |
|------|----------|
| A | Desktop, high GPU, good FPS |
| B | Mid desktop, mobile high-end |
| C | Low-end mobile, reduced-motion, low FPS |

### Detection Hints

- `navigator.hardwareConcurrency`
- `navigator.deviceMemory` (if available)
- `screen.width`, `screen.height`
- FPS probe after init

## 11.2 Viewport Breakpoints

- **Desktop:** 1280px+ — Full 3D, all effects.
- **Tablet:** 768–1279px — Reduced effects, simpler geometry.
- **Mobile:** < 768px — Minimal 3D or fallback.

## 11.3 Touch vs Pointer

- Detect `pointerType` or `ontouchstart` in window.
- Adjust hit targets, disable hover-dependent flows.

---

# 12. Code Patterns & Integration

## 12.1 React Three Fiber Patterns

### Basic Setup

```jsx
import { Canvas } from '@react-three/fiber';

<Canvas
  gl={{ antialias: true, alpha: true }}
  camera={{ fov: 45, near: 0.1, far: 1000 }}
  dpr={[1, 2]}
>
  <Scene />
</Canvas>
```

### useFrame

```jsx
useFrame((state, delta) => {
  // Runs every frame. Use for animation, camera updates.
});
```

### useThree

```jsx
const { camera, gl, scene } = useThree();
```

### Lazy Canvas

```jsx
const LazyCanvas = lazy(() => import('./Canvas'));
// Render after initial content
```

## 12.2 State Management

- Use React state or Zustand/Jotai for UI state.
- Keep 3D state (chapter, camera) in sync with scroll/input.
- Avoid prop drilling; use context for 3D-specific state.

## 12.3 Cleanup

- In `useEffect` or `useFrame`, return cleanup function.
- Dispose geometries, materials, textures.
- Cancel animations (GSAP kill, etc.).

## 12.4 Integration with Astro/Next

- 3D as client-only island. Use `client:load` or `client:visible`.
- Do not SSR 3D canvas (no `window` in SSR).

---

# 13. WebGPU-Specific Implementation

## 13.1 When to Use WebGPU

- Experimental demos.
- Compute shaders for effects.
- Future-proofing when support is broader.

## 13.2 Feature Detection

```javascript
if (navigator.gpu) {
  const adapter = await navigator.gpu.requestAdapter();
  if (adapter) { /* WebGPU path */ }
}
```

## 13.3 Three.js WebGPU Renderer

- Three.js has experimental WebGPU renderer. Check `three/examples/jsm/renderers/webgpu/WebGPURenderer.js`.
- Use behind flag: `?webgpu=1` or capability-based.

## 13.4 Migration Path

- Implement WebGL first. Ensure feature-complete.
- Add WebGPU path as optional enhancement.
- Same scene graph, different renderer.

---

# 14. Debugging, Profiling & Observability

## 14.1 Debug Tools

- **Three.js Inspector:** Browser extension for scene inspection.
- **Spector.js:** WebGL capture and analysis.
- **Chrome DevTools:** Performance tab, FPS meter.

## 14.2 Metrics to Track

- FPS (sliding window).
- Draw calls per frame.
- Memory (GPU and JS).
- Time to first interaction.
- Fallback trigger rate.

## 14.3 Logging

- Log chapter changes, quality tier changes, fallback triggers.
- Use for RUM and debugging.

---

# 15. Deployment & Production Checklist

## 15.1 Pre-Deploy

- [ ] All performance budgets met.
- [ ] Fallback tested (WebGL disabled, reduced-motion).
- [ ] LCP, INP, CLS measured.
- [ ] Cross-browser tested (Chrome, Firefox, Safari, Edge).
- [ ] Mobile tested (iOS Safari, Android Chrome).

## 15.2 Build

- [ ] Tree-shake unused Three.js/drei code.
- [ ] Compress textures and models.
- [ ] Lazy-load 3D bundle.
- [ ] Source maps for debugging.

## 15.3 Runtime

- [ ] Error boundaries around 3D.
- [ ] Graceful degradation on init failure.
- [ ] No console errors in production.

---

# Appendix A: Quick Reference for AI

## A.1 Decision Checklist

When implementing a feature, ask:

1. Does it add narrative value?
2. What is the Tier B/C fallback?
3. What is the performance impact?
4. Is it accessible (keyboard, reduced-motion)?

## A.2 File Structure Suggestion

```
src/
├── components/
│   ├── world/
│   │   ├── ImmersiveWorld.tsx
│   │   ├── chapters/
│   │   │   ├── HeroChapter.tsx
│   │   │   ├── CapabilityChapter.tsx
│   │   │   └── ...
│   │   └── shared/
│   │       ├── HeroObject.tsx
│   │       └── ...
│   └── ui/
│       └── OverlayUI.tsx
├── lib/
│   ├── camera/
│   │   └── scrollCamera.ts
│   ├── quality/
│   │   └── adaptiveQuality.ts
│   └── state/
│       └── experienceState.ts
└── ...
```

## A.3 Key Constants

```javascript
const DPR_MAX = 2;
const FPS_DEGRADE_THRESHOLD = 30;
const FPS_CRITICAL_THRESHOLD = 20;
const SCENE_INIT_TIMEOUT_MS = 1200;
const IDLE_TIMEOUT_MS = 3000;
const REDUCED_MOTION_DURATION_MS = 0;
```

---

*End of Master Guide. Proceed to section-specific guides for deeper implementation detail.*
