# Guide 02: Interaction Layers & Input Handling (Deep Dive)

> **For AI:** Use this guide when implementing pointer tracking, raycasting, scroll-driven behavior, touch handling, and accessibility. Every interaction must be responsive, intentional, and accessible.

---

## 1. Input Architecture Overview

### Input Flow

```
User Input (pointer, scroll, keyboard)
    → Normalize & Throttle
    → Map to State (parallax, chapter, hover)
    → Update 3D Scene
    → Render
```

### Separation of Concerns

- **Input layer:** Raw events, normalization, throttling.
- **State layer:** Derived state (current chapter, hover target, scroll progress).
- **Scene layer:** Apply state to 3D (camera, object rotation, material).

---

## 2. Pointer Handling

### Normalized Coordinates

Convert screen coords to normalized device coordinates (NDC): -1 to 1.

```javascript
function getNDC(clientX, clientY) {
  const x = (clientX / window.innerWidth) * 2 - 1;
  const y = -(clientY / window.innerHeight) * 2 + 1;
  return { x, y };
}
```

### Pointer Move Throttling

- Throttle to 60fps or lower for parallax.
- Use `requestAnimationFrame` or delta-based update.

```javascript
let rafId = null;
function onPointerMove(e) {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    updateParallax(getNDC(e.clientX, e.clientY));
    rafId = null;
  });
}
```

### Pointer vs Touch

- Use `PointerEvent` for unified handling (mouse + touch).
- `pointerType`: `"mouse"`, `"touch"`, `"pen"`.
- For touch: no hover state; use tap for activation.

---

## 3. Raycasting for 3D Picking

### Setup

```javascript
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onPointerMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactiveObjects, true);
  if (intersects.length > 0) {
    const hit = intersects[0];
    // hit.object, hit.point, hit.face
  }
}
```

### Filtering Intersects

- Use `object.userData.interactive = true` to mark pickable objects.
- Filter: `intersects.filter(i => i.object.userData.interactive)`.
- Use `raycaster.layers` to limit which objects are tested.

### Performance

- Raycast only when pointer moves (throttled).
- Limit `intersectObjects` to relevant objects, not entire scene.
- Use bounding sphere/box for complex meshes if needed.

### React Three Fiber: useCursor

```jsx
import { useCursor } from '@react-three/drei';
const [hovered, setHovered] = useState(false);
useCursor(hovered);
<mesh onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} />
```

---

## 4. Parallax Implementation (Hero Object)

### Mapping

- Pointer NDC → target rotation (e.g., -15° to +15°).
- Apply easing (lerp) for smooth follow.

```javascript
const MAX_ROTATION = 0.2; // radians
const LERP_FACTOR = 0.05;

let targetRotationX = 0, targetRotationY = 0;
let currentRotationX = 0, currentRotationY = 0;

function updateParallax(ndc) {
  targetRotationY = ndc.x * MAX_ROTATION;
  targetRotationX = ndc.y * MAX_ROTATION;
}

function animate() {
  currentRotationX += (targetRotationX - currentRotationX) * LERP_FACTOR;
  currentRotationY += (targetRotationY - currentRotationY) * LERP_FACTOR;
  heroObject.rotation.x = currentRotationX;
  heroObject.rotation.y = currentRotationY;
}
```

### Idle Settling

After no input for N seconds, reduce target to (0, 0) with slower lerp for calm state.

```javascript
const IDLE_TIMEOUT = 3000;
let lastInputTime = Date.now();

function updateParallax(ndc) {
  lastInputTime = Date.now();
  targetRotationX = ndc.y * MAX_ROTATION;
  targetRotationY = ndc.x * MAX_ROTATION;
}

function animate() {
  const elapsed = Date.now() - lastInputTime;
  if (elapsed > IDLE_TIMEOUT) {
    targetRotationX *= 0.95;
    targetRotationY *= 0.95;
  }
  // ... lerp to target
}
```

---

## 5. Scroll-Driven Behavior

### Scroll Progress (0–1)

```javascript
function getScrollProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  return docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
}
```

### Scroll Throttling

- Use `{ passive: true }` for scroll listener to avoid blocking.
- Throttle state updates to 60fps.

```javascript
window.addEventListener('scroll', () => {
  const progress = getScrollProgress();
  requestAnimationFrame(() => updateCameraFromScroll(progress));
}, { passive: true });
```

### Scroll-to-Chapter

```javascript
const chapters = [
  { id: 'hero', range: [0, 0.2] },
  { id: 'capability', range: [0.2, 0.6] },
  { id: 'proof', range: [0.6, 0.85] },
  { id: 'conversion', range: [0.85, 1] },
];

function getChapter(progress) {
  return chapters.find(c => progress >= c.range[0] && progress < c.range[1]);
}
```

### Smooth Scroll / Snap

- CSS: `scroll-snap-type: y mandatory` on container.
- Or JS: `window.scrollTo({ top, behavior: 'smooth' })` for programmatic scroll.

---

## 6. Hover & Click Feedback

### Hover

- Scale: 1 → 1.05 over 120ms.
- Emissive: boost intensity.
- Outline: optional outline pass.

```javascript
// GSAP example
mesh.onPointerOver = () => gsap.to(mesh.scale, { x: 1.05, y: 1.05, z: 1.05, duration: 0.12 });
mesh.onPointerOut = () => gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.12 });
```

### Click

- Quick scale down then back: 0.95 → 1 over 100ms.
- Trigger action (navigate, open modal).

```javascript
mesh.onPointerDown = () => {
  gsap.to(mesh.scale, { x: 0.95, y: 0.95, z: 0.95, duration: 0.05 });
};
mesh.onPointerUp = () => {
  gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.1 });
  // handle click action
};
```

### Touch: No Hover

- On touch devices, `pointerover` may not fire as expected.
- Use `pointerdown`/`pointerup` for activation.
- Consider larger hit areas (min 44x44px).

---

## 7. Keyboard Accessibility

### Skip Links

```html
<a href="#main-content" class="skip-link">Skip to content</a>
<a href="#skip-3d" class="skip-link">Skip 3D experience</a>
```

### Keyboard Shortcuts

- `Space` / `ArrowDown`: Next chapter.
- `ArrowUp`: Previous chapter.
- `Escape`: Exit modal, reset.

```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === ' ') {
    e.preventDefault();
    goToNextChapter();
  }
});
```

### Focus Management

- Ensure interactive 3D elements are focusable (`tabIndex={0}`).
- Use `@react-three/drei` `Html` component for 2D overlays with proper focus.

---

## 8. prefers-reduced-motion

### Detection

```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

### Behavior

- Disable parallax (keep object static).
- Use instant camera jumps instead of smooth scroll-driven animation.
- Reduce or remove ambient motion (particles, idle loops).
- Shorten transition durations to 0 or near-0.

```javascript
const transitionDuration = prefersReducedMotion ? 0 : 600;
```

---

## 9. Touch-Specific Considerations

### Hit Target Size

- Minimum 44x44 CSS pixels for touch targets.
- In 3D, ensure projected size on screen meets this.

### Prevent Default

- Avoid `preventDefault()` on `touchmove` unless necessary (e.g., horizontal swipe).
- Preventing default can block scroll.

### Touch vs Mouse

- `pointerdown` on touch may not have `hover` state. Design for tap-to-activate.
- Consider "tap to focus" for complex 3D UI.

---

## 10. Event Cleanup

### Remove Listeners on Unmount

```javascript
useEffect(() => {
  const onScroll = () => { /* ... */ };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

### AbortController for Async

- If input triggers async work, use AbortController to cancel on unmount.

---

## 11. Blossom Tree: Mouse Interaction Spec

**Principle:** Restrained, professional. No twitchy or over-reactive behavior.

| Interaction | Behavior | Params |
|-------------|----------|--------|
| **Pointer move** | Tree sway follows NDC with strong easing (lerp 0.03–0.05). Max rotation ±8° (not ±15°). | `MAX_ROTATION = 0.14`, `LERP = 0.04` |
| **Idle settle** | After 4s no input, target drifts to (0,0) with slower lerp (0.02). Tree returns to calm. | `IDLE_TIMEOUT = 4000` |
| **Particle flow** | Particles subtly drift toward pointer (very subtle, 2–3% influence). Not obvious. | `pointerInfluence = 0.02` |
| **Emissive pulse** | On first pointer move: emissive intensity +5% for 2s, then back. One-time "wake" feel. | `wakeBoost = 1.05`, `wakeDuration = 2000` |
| **Hover (3D UI)** | Only on explicit interactive elements. Scale 1.02 (not 1.05). 150ms ease-out. | Restrained |
| **Touch** | No parallax (causes motion sickness). Tap = same as click. No hover. | `pointerType === 'touch'` → disable sway |

---

*Use this guide with 00-MASTER-GUIDE.md Section 6.*
