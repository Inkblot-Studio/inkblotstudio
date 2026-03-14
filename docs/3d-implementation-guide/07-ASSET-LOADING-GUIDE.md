# Guide 07: Asset Pipeline & Loading (Deep Dive)

> **For AI:** Use this guide when implementing model loading, texture handling, preloading, and error recovery. Assets must load efficiently and fail gracefully.

---

## 1. Asset Types & Formats

### 3D Models

| Format | Use | Notes |
|-------|-----|-------|
| GLB | Primary | Binary GLTF, single file |
| GLTF | Alternative | JSON + external resources |
| Draco | Compression | Smaller files, decode cost |

### Textures

| Format | Use | Fallback |
|--------|-----|----------|
| WebP | Primary | PNG, JPEG |
| KTX2 | GPU-compressed | WebP/PNG |
| PNG | Alpha, UI | — |

### Video (Fallback)

| Format | Use |
|--------|-----|
| MP4 (H.264) | Broad compatibility |
| WebM (VP9) | Smaller, modern browsers |

---

## 2. Loading Strategy

### Critical Path

- Hero model, hero texture: preload or load with high priority.
- Block first paint? No. Load after LCP.

### Deferred

- Other chapter assets: load when chapter is near viewport (e.g., within 20% scroll).
- Use Intersection Observer or scroll position.

### Lazy

- Case study details, video: load on interaction (click, hover).
- Never load everything upfront.

### Priority Hints

```javascript
fetch(url, { priority: 'high' }); // Critical
fetch(url, { priority: 'low' });   // Deferred
```

---

## 3. Three.js LoadingManager

### Setup

```javascript
const manager = new THREE.LoadingManager();

manager.onStart = (url, loaded, total) => {
  console.log(`Loading ${loaded}/${total}`);
};

manager.onProgress = (url, loaded, total) => {
  const progress = (loaded / total) * 100;
  updateProgressBar(progress);
};

manager.onLoad = () => {
  hideProgressBar();
};

manager.onError = (url) => {
  console.error('Failed to load', url);
  showFallback();
};

const loader = new GLTFLoader(manager);
loader.load(url, onSuccess, onProgress, onError);
```

### Multiple Loaders

- Use same `LoadingManager` for all loaders (GLTF, Texture, etc.) to get global progress.

---

## 4. GLB/GLTF Loading

### Basic

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load(
  '/models/hero.glb',
  (gltf) => {
    scene.add(gltf.scene);
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  (error) => {
    console.error(error);
    showPlaceholder();
  }
);
```

### Draco (Compression)

```javascript
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
loader.setDRACOLoader(dracoLoader);
```

### Post-Process Loaded Model

- Scale, position, rotation.
- Replace materials for tier.
- Set `userData` for interactions.
- Compute bounds if needed.

---

## 5. Texture Loading

### Basic

```javascript
const loader = new THREE.TextureLoader();
loader.load(
  url,
  (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    material.map = tex;
  },
  undefined,
  (err) => { /* fallback */ }
);
```

### With Manager

```javascript
const texLoader = new THREE.TextureLoader(manager);
```

### Format Selection

```javascript
const supportsWebP = document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
const ext = supportsWebP ? '.webp' : '.png';
loader.load(`/textures/hero${ext}`);
```

---

## 6. Preloading

### Link Preload

```html
<link rel="preload" href="/models/hero.glb" as="fetch">
<link rel="preload" href="/textures/hero.webp" as="image">
```

### Preload in JS

```javascript
// Preload critical assets before 3D init
async function preloadCritical() {
  const [model, texture] = await Promise.all([
    loadGLB('/models/hero.glb'),
    loadTexture('/textures/hero.webp'),
  ]);
  return { model, texture };
}
```

---

## 7. Error Handling

### Model Load Failure

- Show placeholder geometry (e.g., simple box or sphere).
- Or: show static image fallback.
- Never leave blank/broken space.

### Texture Load Failure

- Use fallback color or placeholder texture.
- `material.color.setHex(0x333333)` if texture fails.

### Timeout

```javascript
const timeout = 10000;
const controller = new AbortController();
const id = setTimeout(() => controller.abort(), timeout);

fetch(url, { signal: controller.signal })
  .then(r => r.blob())
  .then(/* ... */)
  .finally(() => clearTimeout(id));
```

---

## 8. Caching

### Browser Cache

- Set cache headers on server for static assets.
- Use content hashes in filenames for long cache.

### In-Memory

- Keep loaded models/textures in memory for reuse.
- Dispose when switching away from experience (e.g., route change).

---

## 9. React Three Fiber: useLoader

```jsx
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function Model({ url }) {
  const gltf = useLoader(GLTFLoader, url);
  return <primitive object={gltf.scene} />;
}

// With Suspense
<Suspense fallback={<Placeholder />}>
  <Model url="/models/hero.glb" />
</Suspense>
```

### useGLTF (Drei)

```jsx
import { useGLTF } from '@react-three/drei';

function Model() {
  const { scene } = useGLTF('/models/hero.glb');
  return <primitive object={scene} />;
}
```

---

## 10. Asset Budgets

| Asset | Max Size (Tier A) | Format |
|-------|-------------------|--------|
| Hero model | 500KB | GLB, Draco |
| Hero texture | 300KB | WebP |
| Other models | 200KB each | GLB |
| Other textures | 150KB each | WebP |

- Total initial load: ≤ 900KB for hero.
- Defer non-hero to post-LCP.

---

*Use this guide with 00-MASTER-GUIDE.md Section 9.*
