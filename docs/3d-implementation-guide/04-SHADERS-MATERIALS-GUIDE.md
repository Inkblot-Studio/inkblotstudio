# Guide 04: Materials, Lighting & Shaders (Deep Dive)

> **For AI:** Use this guide when implementing PBR materials, custom shaders, lighting setups, and post-processing. Visual quality must align with performance tier.

---

## 1. Material Hierarchy

### Three.js Material Types

| Material | Use Case | Draw Cost |
|----------|----------|------------|
| MeshBasicMaterial | Unlit, UI, fallback | Lowest |
| MeshLambertMaterial | Simple diffuse | Low |
| MeshPhongMaterial | Diffuse + specular | Medium |
| MeshStandardMaterial | PBR, metal/roughness | Medium |
| MeshPhysicalMaterial | PBR + clearcoat, sheen, transmission | High |
| ShaderMaterial | Custom GLSL | Variable |
| RawShaderMaterial | Custom, no built-ins | Variable |

### Tier Mapping

- **Tier A:** MeshPhysicalMaterial, custom ShaderMaterial.
- **Tier B:** MeshStandardMaterial only.
- **Tier C:** MeshBasicMaterial or pre-rendered.

---

## 2. PBR Workflow

### Metal-Roughness Model

- **Base color:** Albedo (diffuse for non-metals, reflectivity for metals).
- **Metalness:** 0 = dielectric, 1 = metal.
- **Roughness:** 0 = mirror, 1 = diffuse.

### Texture Maps

- `map`: Base color.
- `metalnessMap`, `roughnessMap`: Or combined metalness-roughness in one texture (G channel metalness, B channel roughness).
- `normalMap`: Surface detail.
- `aoMap`: Ambient occlusion.

### Environment

- Use `Environment` from `@react-three/drei` or `scene.environment` for IBL (image-based lighting).
- HDR environment maps improve PBR quality significantly.

---

## 3. Custom Shaders

### When to Use

- Unique hero effect (e.g., flowing lines, distortion).
- Performance-critical effects (simpler than built-in).
- Effects not possible with built-in materials.

### Basic Structure

```glsl
// Vertex
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// Fragment
varying vec2 vUv;
uniform float uTime;
void main() {
  gl_FragColor = vec4(vUv, 0.5 + 0.5 * sin(uTime), 1.0);
}
```

### Best Practices

- Use `precision highp float` for quality.
- Avoid dynamic loops (unroll or use fixed iterations).
- Minimize texture fetches.
- Use `#define` for constants.

### Fallback

- Wrap shader init in try/catch.
- On compile failure, fall back to MeshBasicMaterial.

---

## 4. Glass & Transparency

### MeshPhysicalMaterial

```javascript
new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0,
  roughness: 0,
  transmission: 1,
  thickness: 0.5,
  ior: 1.5,
});
```

### Performance

- Transparency is expensive (sorting, overdraw).
- Use sparingly. Prefer opaque when possible.
- Tier B/C: disable transmission, use opaque approximation.

---

## 5. Lighting Setup

### Three-Point Lighting

```javascript
// Key light (main)
const key = new THREE.DirectionalLight(0xffffff, 1);
key.position.set(5, 5, 5);

// Fill light (soften shadows)
const fill = new THREE.DirectionalLight(0xffffff, 0.3);
fill.position.set(-5, 2, 5);

// Rim light (edge definition)
const rim = new THREE.DirectionalLight(0xffffff, 0.2);
rim.position.set(0, 5, -5);

scene.add(key, fill, rim);
```

### Ambient

```javascript
const ambient = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambient);
```

### Point Lights

- Use for localized glow (e.g., hero accent).
- Limit count (1–2 per scene) — expensive.

### Shadows

- Enable only when necessary: `light.castShadow = true`.
- Adjust `shadow.mapSize` (1024 or 2048).
- Set `shadow.camera` bounds to fit scene.
- Tier B/C: consider disabling shadows.

---

## 6. Post-Processing

### EffectComposer

```javascript
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';

<EffectComposer>
  <Bloom intensity={0.5} radius={0.4} luminanceThreshold={0.9} />
  <ToneMapping />
</EffectComposer>
```

### Bloom

- Use for luxury glow on hero.
- Keep `intensity` low (0.3–0.6).
- `luminanceThreshold` high to limit affected areas.
- **Tier B:** Reduce or disable.
- **Tier C:** Disable.

### Tone Mapping

- ACESFilmic or similar for cinematic look.
- Avoid default Linear for HDR-like scenes.

### Vignette

- Optional, subtle. Darkens edges.
- Use sparingly.

### Performance

- Each pass = extra render. Minimize passes.
- Disable post-processing when FPS drops.

---

## 7. Visual Language (Activetheory-Informed)

### Material Language

- Glass-metal hybrid with emissive edge-lit accents.
- Translucent core, crisp glow on edges (electric cyan #00e5ff).
- Restrained glow accents; avoid flat matte, noisy gradients.
- See [09-VISUAL-REFERENCE-ACTIVETHEORY-BEYOND.md](./09-VISUAL-REFERENCE-ACTIVETHEORY-BEYOND.md) for full spec.

### Color Palette

- **Background:** #050508, #0a0a0f. Atmospheric gradient: #0a2f3d → #0d464f.
- **Emissive primary:** #00e5ff, #00d4ff (electric cyan).
- **Emissive secondary:** #00ff88, #7fff7f (lime/green).
- **Warm accent:** #f0c050 (gold), #ff9944 (orange).
- **Particle palette:** #4488ff, #aa66ff, #00dd88, #ffffff.

### Emissive

- Use for hero edges, rings, trails, particles.
- `emissive`, `emissiveIntensity` on materials.
- Dynamic intensity: respond to pointer or scroll for interactivity.

### Blossom: Restraint Guidelines

| Effect | Use | Avoid |
|--------|-----|-------|
| Bloom | Subtle (intensity 0.3–0.4). Only on blossom glow. | Strong bloom, multiple bloom passes |
| Particles | Sparse. Max 500–800. Slow drift. | Dense clouds, fast motion |
| Trails | 1–2 subtle trails. Low opacity. | Many overlapping trails |
| Parallax | 8° max rotation. Strong easing. | Twitchy, high-amplitude |
| Idle motion | 4–8s loops. Barely perceptible. | Constant obvious motion |
| Post-FX | Tone mapping + optional subtle vignette. | Chromatic aberration, heavy grain |

Use `getBlossomColors()` from theme config for all blossom-related materials. See [BLOSSOM-TREE-CONCEPT.md](./BLOSSOM-TREE-CONCEPT.md) Dynamic Blossom Color System.

---

## 8. Shader Snippets for AI

### Animated UV

```glsl
vUv = uv + vec2(uTime * 0.1, 0.0);
```

### Fresnel (Rim Effect)

```glsl
float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), 2.0);
gl_FragColor.rgb += fresnel * uRimColor;
```

### Vertex Displacement

```glsl
vec3 pos = position + normal * sin(uTime + position.x) * 0.1;
gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
```

---

*Use this guide with 00-MASTER-GUIDE.md Section 7.*
