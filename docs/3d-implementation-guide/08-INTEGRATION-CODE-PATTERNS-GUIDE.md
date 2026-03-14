# Guide 08: Integration & Code Patterns (Deep Dive)

> **For AI:** Use this guide when integrating 3D with React, Astro, Next.js, or vanilla JS. Covers patterns, cleanup, and framework-specific considerations.

---

## 1. Framework Integration Overview

### React (Create React App, Vite, Next)

- Use React Three Fiber (R3F) for declarative Three.js.
- 3D is client-only. Use `dynamic` import with `ssr: false` in Next, or `client:load` in Astro.

### Astro

- 3D as island: `<ImmersiveWorld client:load />` or `client:visible` for below-fold.
- Ensures 3D bundle loads only when needed.

### Vanilla JS

- Use Three.js directly. No R3F.
- Manual scene graph, `requestAnimationFrame` loop.

---

## 2. React Three Fiber Patterns

### Canvas Setup

```jsx
import { Canvas } from '@react-three/fiber';

<Canvas
  gl={{
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  }}
  camera={{ fov: 45, near: 0.1, far: 1000, position: [0, 0, 8] }}
  dpr={[1, 2]}
  frameloop="demand"  // Or "always" for continuous
>
  <Scene />
</Canvas>
```

### useFrame

```jsx
import { useFrame } from '@react-three/fiber';

function AnimatedObject() {
  const ref = useRef();
  useFrame((state, delta) => {
    ref.current.rotation.y += delta * 0.5;
  });
  return <mesh ref={ref}>...</mesh>;
}
```

### useThree

```jsx
import { useThree } from '@react-three/fiber';

function CameraController() {
  const { camera } = useThree();
  // Update camera from scroll, etc.
}
```

### useLoader (with Suspense)

```jsx
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function Model({ url }) {
  const gltf = useLoader(GLTFLoader, url);
  return <primitive object={gltf.scene} />;
}

<Suspense fallback={<mesh><boxGeometry /><meshBasicMaterial color="gray" /></mesh>}>
  <Model url="/hero.glb" />
</Suspense>
```

---

## 3. State Management

### Local State (useState)

- Chapter, hover, scroll progress.
- Fine for single-component or small tree.

### Context

- Share scroll progress, quality tier, chapter across 3D tree.
- Avoid over-use; context changes cause re-renders.

```jsx
const ExperienceContext = createContext();

function ExperienceProvider({ children }) {
  const [chapter, setChapter] = useState('hero');
  const [scrollProgress, setScrollProgress] = useState(0);
  return (
    <ExperienceContext.Provider value={{ chapter, setChapter, scrollProgress, setScrollProgress }}>
      {children}
    </ExperienceContext.Provider>
  );
}
```

### External Store (Zustand, Jotai)

- For complex state, especially when used outside React tree.
- Use for: quality tier, experience state, analytics.

---

## 4. Scroll Integration

### Option A: Native Scroll

- Listen to `window.scrollY`.
- Map to progress, chapter, camera.
- Works with normal page layout.

### Option B: Full-Height Sections

- Each chapter = 100vh section.
- Scroll snaps or smooth scroll.
- 3D canvas fixed or in each section.

### Option C: Virtual Scroll (Custom)

- Custom scroll container for full control.
- More complex; use when native scroll insufficient.

---

## 5. Cleanup

### useEffect Cleanup

```jsx
useEffect(() => {
  const onScroll = () => { /* ... */ };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

### useFrame Cleanup

- No explicit cleanup for useFrame; component unmount stops it.
- Cancel any external animations (GSAP) in cleanup.

### Disposing Resources

```jsx
useEffect(() => {
  return () => {
    geometry.dispose();
    material.dispose();
  };
}, []);
```

### R3F Auto-Cleanup

- R3F disposes of objects it creates when component unmounts.
- Manually created objects (e.g., in useLoader callback): dispose in cleanup.

---

## 6. Error Boundaries

### Wrap 3D Canvas

```jsx
<ErrorBoundary fallback={<StaticHero />}>
  <Canvas>
    <Scene />
  </Canvas>
</ErrorBoundary>
```

### Fallback UI

- Show static hero image, 2D layout.
- Ensure CTA and content remain accessible.

---

## 7. Lazy Loading 3D Bundle

### Dynamic Import

```jsx
const ImmersiveWorld = lazy(() => import('./ImmersiveWorld'));

<Suspense fallback={<StaticHero />}>
  <ImmersiveWorld />
</Suspense>
```

### Load After LCP

```jsx
const [show3D, setShow3D] = useState(false);

useEffect(() => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => setShow3D(true), { timeout: 2000 });
  } else {
    setTimeout(() => setShow3D(true), 2000);
  }
}, []);
```

---

## 8. TypeScript

### Three.js Types

- `@types/three` or bundled in `three`.
- Use for scene, camera, materials, etc.

### R3F Types

- `@react-three/fiber` has types for `useFrame`, `useThree`, etc.
- `ThreeElements` for JSX elements.

### Custom Types

```typescript
interface ChapterConfig {
  id: string;
  scrollRange: [number, number];
  cameraKeyframes: CameraKeyframe[];
}
```

---

## 9. Testing

### Unit Tests

- Test state logic, scroll mapping, chapter detection.
- Mock `window.scrollY`, `matchMedia`.

### E2E Tests

- Use Playwright or Cypress.
- Test: 3D loads, fallback works, CTA clickable.
- Consider disabling WebGL in test env for speed.

---

## 10. File Structure

```
src/
├── components/
│   ├── world/
│   │   ├── ImmersiveWorld.tsx      # Main 3D root
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
│   ├── state/
│   │   └── experienceState.ts
│   └── telemetry/
│       └── events.ts
└── ...
```

---

*Use this guide with 00-MASTER-GUIDE.md Section 12.*
