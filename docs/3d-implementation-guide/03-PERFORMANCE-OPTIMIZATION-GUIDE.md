# Guide 03: Performance & Optimization (Deep Dive)

> **For AI:** Use this guide when implementing performance budgets, adaptive quality, FPS monitoring, geometry/texture optimization, and degradation strategies. Performance is non-negotiable for premium perception.

---

## 1. Performance Budgets (Strict)

### Core Web Vitals

| Metric | Target (p75) | Measurement |
|--------|--------------|-------------|
| LCP | ≤ 2.5s | Largest contentful paint |
| INP | ≤ 200ms | Interaction to next paint |
| CLS | ≤ 0.1 | Cumulative layout shift |

### Resource Budgets (First Load)

| Resource | Budget | Notes |
|----------|--------|-------|
| Critical JS | ≤ 250KB gzip | Blocking scripts |
| Total JS | ≤ 450KB gzip | Initial route |
| CSS | ≤ 90KB gzip | Critical + initial |
| Hero media | ≤ 900KB | 3D assets, textures |
| Requests | ≤ 55 | Total initial |

### Runtime Budgets

- Main-thread tasks > 50ms: avoid in interaction hotspots.
- Animation: sustain ~60fps on Tier A devices.
- Scene init to first interaction: ≤ 1.2s.

---

## 2. Adaptive Quality Engine

### Tier Definitions

| Tier | Devices | Geometry | Materials | Post-FX | Pixel Ratio |
|------|---------|----------|-----------|---------|-------------|
| A | High-end desktop | Full | Physical | Bloom, tone | 2 |
| B | Mid desktop, high mobile | Reduced | Standard | Tone only | 1.5 |
| C | Low-end, reduced-motion | Minimal/Video | Basic/None | None | 1 |

### Detection Logic

```javascript
function detectTier() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'C';
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const isMobile = /Android|webOS|iPhone|iPad/i.test(navigator.userAgent);
  if (isMobile && (cores < 6 || memory < 4)) return 'C';
  if (isMobile || cores < 8) return 'B';
  return 'A';
}
```

### FPS-Based Degradation

Monitor FPS over sliding window. Degrade when sustained low FPS.

```javascript
const FPS_WINDOW = 60; // frames
const FPS_DEGRADE = 30;
const FPS_CRITICAL = 20;

const frameTimes = [];
function measureFPS(delta) {
  frameTimes.push(1000 / delta);
  if (frameTimes.length > FPS_WINDOW) frameTimes.shift();
  const avgFPS = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  if (avgFPS < FPS_CRITICAL) return 'critical';
  if (avgFPS < FPS_DEGRADE) return 'degrade';
  return 'ok';
}
```

### Degradation Order

1. Disable bloom (post-processing).
2. Reduce pixel ratio (2 → 1.5 → 1).
3. Simplify materials (Physical → Standard → Basic).
4. Reduce geometry (LOD, hide decorative objects).
5. Switch to video/static fallback.

### Recovery

- If FPS recovers (e.g., user scrolls away from heavy section), consider stepping quality back up after a delay (e.g., 5s of good FPS).

---

## 3. Geometry Optimization

### Level of Detail (LOD)

```javascript
const lod = new THREE.LOD();
lod.addLevel(highDetailMesh, 0);   // 0-20 units
lod.addLevel(midDetailMesh, 20);   // 20-50 units
lod.addLevel(lowDetailMesh, 50);   // 50+ units
```

- Use 2–3 levels. Avoid more (overhead).
- Distance thresholds depend on camera FOV and typical distances.

### Instancing

For repeated geometry (particles, trees, tiles):

```javascript
const count = 1000;
const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
const matrix = new THREE.Matrix4();
for (let i = 0; i < count; i++) {
  matrix.setPosition(Math.random() * 10, Math.random() * 10, Math.random() * 10);
  instancedMesh.setMatrixAt(i, matrix);
}
instancedMesh.instanceMatrix.needsUpdate = true;
```

### Decimation

- Reduce polygon count for Tier B/C.
- Use Blender decimate modifier or similar in pipeline.
- Target: 50% reduction for Tier B, 75% for Tier C.

### Frustum Culling

- Three.js does this automatically.
- Ensure `boundingSphere`/`boundingBox` are correct: `geometry.computeBoundingSphere()`.

### Merge Geometry (Static)

For static, non-animated objects, merge into single mesh to reduce draw calls. Use with caution (loses individual culling).

---

## 4. Texture Optimization

### Format

- WebP primary, PNG/JPEG fallback.
- Use `sizes` and `srcset` for responsive images if in HTML.

### Resolution by Tier

| Tier | Max Texture Size |
|------|------------------|
| A | 2048 |
| B | 1024 |
| C | 512 |

### Compression

- Use KTX2/Basis Universal for GPU-compressed textures (when supported).
- Or compress in pipeline (TinyPNG, etc.).

### Mipmaps

- Enable for textures used on distant objects: `texture.generateMipmaps = true`.
- Reduces aliasing and can improve cache efficiency.

### Atlas

- Combine small textures into atlas to reduce draw calls and state changes.

---

## 5. Material Optimization

### Draw Calls

- Each material = potential draw call (with same geometry).
- Batch: use same material for multiple objects when possible.
- Use `material.needsUpdate` only when necessary.

### Shader Complexity

- Tier A: Custom shaders, physical materials.
- Tier B: Standard materials only.
- Tier C: Basic materials or unlit.

### Dispose

- When removing objects, dispose materials: `material.dispose()`.
- Shared materials: only dispose when last user is removed.

---

## 6. Object Pooling

### Avoid Create/Destroy in Loop

```javascript
// BAD
function update() {
  scene.remove(oldParticle);
  const newParticle = createParticle();
  scene.add(newParticle);
}

// GOOD: Pool
const pool = [];
function getParticle() {
  return pool.length ? pool.pop() : createParticle();
}
function releaseParticle(p) {
  p.visible = false;
  pool.push(p);
}
```

### Geometry and Material Pools

- Reuse `BufferGeometry` and `Material` across similar objects.
- Create once, assign many times.

---

## 7. Memory Management

### Disposal Checklist

When removing object from scene:

```javascript
function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
  scene.remove(object);
}
```

### Texture Disposal

- `texture.dispose()` when no longer needed.
- Clear `texture.image` reference if holding large image.

### Render Target Disposal

- Post-processing render targets: `renderTarget.dispose()` when switching effects.

---

## 8. Lazy Loading 3D

### Defer 3D Bundle

- Load Three.js and 3D components only after initial HTML/CSS/JS.
- Use dynamic `import()`:

```javascript
const load3D = () => import('./ImmersiveWorld');
// Call after LCP or user interaction
```

### Progressive Enhancement

- Show static hero image first.
- Replace with 3D when loaded.
- Ensure no layout shift (CLS).

---

## 9. Monitoring & Telemetry

### Metrics to Track

- FPS (sliding average).
- Draw calls per frame.
- Memory (if available: `performance.memory` in Chrome).
- Time to first interaction.
- Quality tier and degradation events.

### Reporting

```javascript
// Example: report degradation
function reportQualityChange(from, to) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'quality_change', { from, to });
  }
}
```

---

## 10. Testing Performance

### Chrome DevTools

- Performance tab: record, analyze main thread.
- FPS meter: enable in Rendering tab.
- Memory: heap snapshots.

### Lighthouse

- Run in CI or pre-deploy.
- Check LCP, INP, CLS.

### Real Device Testing

- Test on mid-tier mobile (e.g., iPhone 12, mid-range Android).
- Test on low-end desktop (integrated GPU).

---

*Use this guide with 00-MASTER-GUIDE.md Section 8.*
