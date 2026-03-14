# Guide 01: Scene Architecture & Composition (Deep Dive)

> **For AI:** Use this guide when implementing scene structure, chapter transitions, layer management, and world composition. Every pattern here is designed for maintainability and performance.

---

## 1. Single World vs Multi-Scene

### Recommendation: Single World

Use **one continuous scene** with logical chapters. Avoid creating multiple `THREE.Scene` instances and swapping them.

**Why:**
- Smoother transitions (no teardown/recreate).
- Shared resources (materials, geometries) stay in memory.
- Simpler camera choreography (one camera, one view).
- Easier state management.

### Anti-Pattern

```javascript
// BAD: Multiple scenes
const scene1 = new THREE.Scene();
const scene2 = new THREE.Scene();
renderer.render(scene1, camera); // then later
renderer.render(scene2, camera); // causes flicker, re-init
```

### Correct Pattern

```javascript
// GOOD: One scene, visibility toggles
const world = new THREE.Group();
const chapterHero = new THREE.Group();
const chapterCapability = new THREE.Group();
world.add(chapterHero);
world.add(chapterCapability);
scene.add(world);

// Switch chapters by visibility
chapterHero.visible = true;
chapterCapability.visible = false;
```

---

## 2. Chapter Container Pattern

### Structure

Each chapter is a `THREE.Group` with:

- `name`: e.g., `"chapter-hero"`
- `userData`: `{ chapterId, scrollStart, scrollEnd, cameraKeyframes }`
- Children: geometry, lights, helpers

### Chapter Interface (TypeScript)

```typescript
interface ChapterConfig {
  id: string;
  scrollRange: [number, number];
  cameraKeyframes: {
    start: { position: [number, number, number]; target: [number, number, number] };
    end: { position: [number, number, number]; target: [number, number, number] };
  };
  content?: { title: string; body: string; cta?: string };
  interactions?: InteractionConfig[];
}
```

### Creating Chapters

```javascript
function createChapter(config) {
  const group = new THREE.Group();
  group.name = `chapter-${config.id}`;
  group.userData = config;
  group.visible = false;
  return group;
}
```

---

## 3. Visibility & Culling Strategy

### When to Show/Hide

- **Active chapter:** Fully visible, full update (animations, interactions).
- **Adjacent chapters:** Visible but reduced update (e.g., no particle sim).
- **Distant chapters:** Hidden (`visible = false`) to skip render and update.

### Distance-Based Culling

If using scroll position:

```javascript
const BUFFER = 0.1; // 10% scroll buffer
function shouldUpdateChapter(chapter, scroll) {
  const [start, end] = chapter.userData.scrollRange;
  return scroll >= start - BUFFER && scroll <= end + BUFFER;
}
```

### Matrix Auto-Update

For hidden chapters, consider `object.matrixAutoUpdate = false` to skip matrix updates. Re-enable when chapter becomes active.

---

## 4. Layer System Deep Dive

### Layer Masks

Three.js uses a 32-bit mask. Each object has `layers` (default 0). Camera has `layers` that determine what is rendered.

```javascript
// Object on layer 1
object.layers.set(1);

// Camera sees layers 0 and 1
camera.layers.set(0);
camera.layers.enable(1);

// Camera sees only layer 1
camera.layers.set(1);
```

### Use Cases

| Use Case | Layers |
|----------|--------|
| Main world | 0 |
| Hero object (separate pass for glow) | 1 |
| 3D UI elements | 2 |
| Reflection plane | 3 |
| Shadow casters only | 4 |

### Multi-Pass Rendering

For effects like outline or glow:

1. Render main scene (layer 0).
2. Render hero to texture (layer 1).
3. Apply post-process (blur, composite).
4. Composite with main scene.

---

## 5. Coordinate System Conventions

### World Origin

- **Origin (0,0,0):** Narrative focus. Typically center of hero or first chapter.
- **Camera:** Starts behind and above origin. Moves around it.

### Axes

- **X:** Right (positive), Left (negative).
- **Y:** Up (positive), Down (negative).
- **Z:** Toward camera (negative in default Three.js), Away (positive).

### Scale

- 1 unit = 1 meter. Imported models may need scale correction.
- Hero object: typically 2–4 units in size for comfortable viewing at camera distance 6–10.

---

## 6. Grouping for Animation

### Rule: Animate the Parent

When multiple objects move together, group them and animate the group.

```javascript
const heroGroup = new THREE.Group();
heroGroup.add(heroMesh);
heroGroup.add(glowMesh);
heroGroup.add(particleSystem);
scene.add(heroGroup);

// Animate group
gsap.to(heroGroup.rotation, { y: Math.PI * 2, duration: 4 });
```

### Nested Groups

For complex hierarchies:

```
HeroGroup
├── BodyGroup (main mesh)
├── GlowGroup (glow effect)
└── ParticleGroup (ambient particles)
```

Animate at the appropriate level. BodyGroup rotates; ParticleGroup may have independent motion.

---

## 7. Scene Graph Best Practices

### Avoid Deep Nesting

- Keep hierarchy shallow (3–4 levels max) when possible.
- Deep trees increase matrix update cost.

### Static vs Dynamic

- Mark static objects: `object.matrixAutoUpdate = false` after initial placement.
- Reduces per-frame work.

### Bounding Volumes

- Ensure complex meshes have correct `boundingSphere`/`boundingBox` for frustum culling.
- `geometry.computeBoundingSphere()` if needed.

---

## 8. Integration with React Three Fiber

### Declarative Chapters

```jsx
<group name="world">
  <ChapterHero visible={chapter === 'hero'} />
  <ChapterCapability visible={chapter === 'capability'} />
  <ChapterProof visible={chapter === 'proof'} />
  <ChapterConversion visible={chapter === 'conversion'} />
</group>
```

### Conditional Rendering

Use `visible` prop instead of conditional mount when possible. Mounting/unmounting causes create/destroy; visibility toggle is cheaper.

### Suspense for Async

```jsx
<Suspense fallback={<PlaceholderGeometry />}>
  <HeroObject url="/models/hero.glb" />
</Suspense>
```

---

## 9. Memory Management

### Disposal Checklist

When removing a chapter or object:

1. `object.traverse(child => { if (child.geometry) child.geometry.dispose(); if (child.material) child.material.dispose(); })`
2. `scene.remove(object)`
3. Clear any references

### Shared Resources

- Reuse `BufferGeometry` and `Material` when objects are similar.
- Use `InstancedMesh` for many identical objects.

---

## 10. Debugging Scene Structure

### Logging Hierarchy

```javascript
scene.traverse(obj => {
  console.log(obj.name || obj.type, obj.position, obj.visible);
});
```

### Three.js Inspector

- Install browser extension.
- Inspect scene graph, materials, textures in real time.

### Bounds Visualization

```javascript
const box = new THREE.Box3().setFromObject(object);
const helper = new THREE.Box3Helper(box, 0xff0000);
scene.add(helper);
```

---

*Use this guide in conjunction with 00-MASTER-GUIDE.md Section 3.*
