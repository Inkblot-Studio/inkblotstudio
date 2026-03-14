# Guide 06: WebGPU-Specific Implementation (Deep Dive)

> **For AI:** Use this guide when implementing or planning WebGPU support. WebGPU is experimental; always provide WebGL fallback.

---

## 1. WebGPU vs WebGL

### WebGPU Advantages

- Modern pipeline (compute, storage buffers).
- Better multi-threading potential.
- Compute shaders for effects.
- More explicit resource management.

### WebGPU Limitations

- Limited support: Chrome, Edge; Safari experimental.
- No Firefox support (as of 2025).
- API is different; not drop-in replacement.

### Recommendation

- **Production:** WebGL 2 via Three.js. Universal.
- **Experimental:** WebGPU optional path behind feature flag or capability detection.
- **Future:** As support grows, WebGPU can become primary with WebGL fallback.

---

## 2. Feature Detection

### Basic Check

```javascript
async function supportsWebGPU() {
  if (typeof navigator.gpu === 'undefined') return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch (e) {
    return false;
  }
}
```

### Usage

```javascript
const useWebGPU = await supportsWebGPU() && !isLowTierDevice();
if (useWebGPU) {
  initWebGPURenderer();
} else {
  initWebGLRenderer();
}
```

---

## 3. Three.js WebGPU Renderer

### Status

- Three.js has experimental WebGPU renderer in `examples/jsm/renderers/webgpu/`.
- Check Three.js docs for current API.

### Basic Setup (Conceptual)

```javascript
import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';

const renderer = new WebGPURenderer({ antialias: true });
renderer.init().then(() => {
  // Ready to render
});
```

### Compatibility

- Most Three.js materials work with WebGPU renderer.
- Some features may differ. Test thoroughly.

---

## 4. Compute Shaders (WebGPU Only)

### Use Cases

- Particle simulation.
- Post-processing (blur, custom effects).
- Crowd/fluid simulation.

### Pipeline

1. Create compute pipeline with WGSL shader.
2. Bind buffers (input, output).
3. Dispatch workgroups.
4. Use result in render pass.

### Example (Conceptual)

```wgsl
// compute.wgsl
@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  particles[i].position += particles[i].velocity * 0.016;
}
```

---

## 5. Migration Path

### Phase 1: WebGL Only

- Implement full experience in WebGL.
- Ensure feature-complete, performant.

### Phase 2: WebGPU Optional

- Add WebGPU init path behind detection.
- Same scene graph, swap renderer.
- Validate visual parity.

### Phase 3: WebGPU Enhancements

- Add compute-based effects (e.g., advanced particles).
- These are WebGPU-only; fallback to simplified WebGL version.

---

## 6. Guarding WebGPU Code

### Non-Production Guard

```javascript
const WEBGPU_ENABLED = import.meta.env.DEV && (new URLSearchParams(location.search).get('webgpu') === '1');
```

### Capability-Based

```javascript
const WEBGPU_ENABLED = await supportsWebGPU() && tier === 'A';
```

### Never Block

- WebGPU must never be required for core experience.
- Fallback must always work.

---

## 7. Debugging WebGPU

### Chrome

- DevTools → More tools → WebGPU.
- Inspect pipelines, buffers, shaders.

### Error Handling

- WebGPU can fail at init (adapter, device).
- Catch errors, log, fall back to WebGL.

```javascript
try {
  await initWebGPU();
} catch (e) {
  console.warn('WebGPU init failed, using WebGL', e);
  initWebGL();
}
```

---

*Use this guide with 00-MASTER-GUIDE.md Section 13.*
