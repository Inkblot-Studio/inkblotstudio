# Guide 10: Loading Screen (Deep Dive)

> **For AI:** Use this guide when implementing the loading screen for the blossom tree 3D experience. Professional, branded, with progress (0–100%).

---

## 1. Design Goal

- **Professional:** Minimal, branded, not distracting.
- **Progress:** Show loading percentage (0–100%).
- **Background:** Same as hero (deep plum/charcoal gradient).
- **Transition:** Smooth fade to hero when ready.

---

## 2. Layout

```
┌─────────────────────────────────────────┐
│                                         │
│           [Blossom tree icon/silhouette]│
│              or subtle animation         │
│                                         │
│              Inkblot Studio              │
│                                         │
│         ████████░░░░░░░░  42%           │
│                                         │
└─────────────────────────────────────────┘
```

### Elements

| Element | Spec |
|---------|------|
| **Icon** | Minimal blossom tree silhouette or logo. Subtle pulse (optional). |
| **Company name** | "Inkblot Studio". Font: `var(--font-display)`. Weight 500. Color: `var(--color-cream)`. |
| **Progress bar** | Horizontal bar. Fill color: `var(--blossom-color)` or `var(--color-blossom)`. Track: dark, subtle. |
| **Percentage** | "42%". Same font as body. Light gray/cream. |

---

## 3. Progress Source

### Three.js LoadingManager

```javascript
const manager = new THREE.LoadingManager();
manager.onProgress = (url, loaded, total) => {
  const progress = total > 0 ? (loaded / total) * 100 : 0;
  updateLoadingProgress(progress);
};
manager.onLoad = () => {
  updateLoadingProgress(100);
  onLoadComplete();
};
```

### Integration

- Pass `manager` to GLTFLoader, TextureLoader, etc.
- Emit progress to React state or global store.
- When progress = 100% and scene is ready, trigger transition out.

---

## 4. Timing

| Rule | Value | Purpose |
|------|-------|---------|
| **Min display time** | 800ms | Avoid flash if load is instant |
| **Transition out** | 400ms | Fade to hero |
| **Progress update throttle** | 60fps max | Avoid janky bar animation |

### Implementation

```javascript
const MIN_DISPLAY_MS = 800;
const FADE_OUT_MS = 400;

let loadStartTime = Date.now();

function onLoadComplete() {
  const elapsed = Date.now() - loadStartTime;
  const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
  setTimeout(() => {
    fadeOutLoadingScreen(FADE_OUT_MS);
  }, remaining);
}
```

---

## 5. Styling

### Background

- Same gradient as hero: deep plum (#2d1b3d) → charcoal (#1a1518).
- Or use `var(--color-plum)`, `var(--color-void)`.

### Progress Bar

- **Track:** Dark, 2–4px height. Border-radius 2px.
- **Fill:** `var(--blossom-color)` or `var(--color-blossom)`. Smooth transition on progress change.
- **Width:** 200–300px. Centered.

### Animation

- **Icon:** Optional subtle pulse (scale 1 → 1.02, 2s loop). No busy motion.
- **Bar:** Fill animates with `transition: width 0.15s ease-out`.

---

## 6. Accessibility

- **Screen reader:** Announce progress: `aria-live="polite"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`.
- **Reduced motion:** Skip pulse animation. Instant bar updates.

---

## 7. Fallback

- If 3D fails to load: show error state with "Continue without 3D" or retry.
- Never leave user stuck on loading screen indefinitely. Timeout after 15s with fallback.

---

*Use this guide with BLOSSOM-TREE-CONCEPT.md and 07-ASSET-LOADING-GUIDE.md.*
