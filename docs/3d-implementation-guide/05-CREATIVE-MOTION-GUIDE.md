# Guide 05: Creative & Motion Design (Deep Dive)

> **For AI:** Use this guide when implementing motion choreography, easing, narrative beats, and signature interactions. Every motion must serve the narrative.

---

## 1. Motion Philosophy

### One Motion, One Intention

Each motion supports exactly one of: **awe**, **understanding**, **trust**, **action**.

- **Awe:** Hero intro, reveal, scale.
- **Understanding:** Camera move through capability, node highlight.
- **Trust:** Case study layer reveal, metric animation.
- **Action:** CTA hover, form open, conversion feedback.

### Restraint

- Premium = minimal. Avoid motion for its own sake.
- If removing a motion doesn't change meaning, remove it.

---

## 2. Duration & Easing Reference

### Duration by Type

| Type | Duration | Easing | Example |
|------|----------|--------|---------|
| Intro | 1200–2500ms | ease-out | Hero load |
| Section transition | 450–900ms | ease-in-out | Camera move |
| Microinteraction | 120–280ms | ease-out | Hover, click |
| Idle loop | 4000–8000ms | linear/sine | Ambient float |

### Easing Functions

- **ease-out:** Decelerate at end. Good for entrances.
- **ease-in-out:** Smooth start and end. Good for transitions.
- **ease-out-expo:** Strong deceleration. Good for dramatic settles.
- **linear:** Constant speed. Good for loops.

### GSAP Eases

```javascript
gsap.ease.out
gsap.ease.inOut
gsap.ease.outExpo
// Custom cubic-bezier
gsap.ease.custom(0.25, 0.1, 0.25, 1)
```

---

## 3. Signature Interactions (Detailed)

### 3.1 Hero Intelligence Object

**Intent:** Immediate premium differentiation, invite first interaction.

**Behavior:**
1. On load: subtle intro motion (≤ 2.5s). Scale from 0.8 to 1, fade in.
2. Pointer: influences rotation and light parallax. Eased response.
3. After first interaction: settle to low-amplitude idle (reduce rotation range by 50%).

**Conversion Link:**
- Primary CTA appears after intro completion (or immediately in fallback).
- Secondary CTA after 2s pause for users who don't convert immediately.

**Fallback:**
- Pre-rendered video loop for Tier C.
- Static hero image if reduced-motion.

### 3.2 Scroll-Driven Capability Journey

**Intent:** Turn service explanation into immersive narrative.

**Behavior:**
1. Scroll advances camera through 3–4 capability scenes.
2. Each scene: one capability statement + one proof point.
3. Snap points for intentional pacing (optional).

**Conversion Link:**
- Mid-sequence CTA after second capability.
- Micro-CTA at each scene: "See this in a client outcome."

**Fallback:**
- 2D layered motion panels, same copy and CTA order.

### 3.3 Decision Node Explainer

**Intent:** Make complex orchestration understandable.

**Behavior:**
1. 3D nodes represent system components.
2. Toggle layers: strategy, design, engineering, outcomes.
3. Hover/tap: context cards with before/after impact.

**Conversion Link:**
- "Discuss a similar challenge" after 2+ layer toggles.
- Deep engagement = high-intent signal.

**Fallback:**
- Interactive SVG with same layer logic.

### 3.4 CTA Pre-Commitment

**Intent:** Qualify intent before form.

**Behavior:**
1. Before form: select challenge type in short interactive module.
2. Selection customizes form framing.
3. Completion: tailored meeting value statement.

**Fallback:**
- Standard radio selection, same data capture.

---

## 4. Camera Choreography

### Keyframe Design

- Define position and target at each narrative beat.
- Use smooth interpolation between keyframes.
- Avoid sharp direction changes.

### Scroll-to-Camera Mapping

```javascript
// Example keyframes
const keyframes = [
  { scroll: 0,   pos: [0, 0, 8],   target: [0, 0, 0] },
  { scroll: 0.25, pos: [2, 1, 6],   target: [0, 0, 0] },
  { scroll: 0.5,  pos: [0, 2, 4],   target: [0, 0, 0] },
  { scroll: 0.75, pos: [-2, 1, 6],  target: [0, 0, 0] },
  { scroll: 1,    pos: [0, 0, 8],   target: [0, 0, 0] },
];
```

### Easing

- Camera moves: ease-in-out or custom smooth curve.
- Never linear for camera (feels robotic).

### Blossom Tree: Scroll-Driven Choreography

**Principle:** Smooth, narrative-driven. Camera and tree respond to scroll; no jank.

| Scroll range | Camera | Tree / Scene |
|--------------|--------|--------------|
| 0–0.15 | Hero: camera at (0, 0, 8), target (0, 0, 0). Tree centered. | Tree visible, particles active |
| 0.15–0.4 | Capability: camera arcs right, slight rise. Ease-in-out. | Tree scales down 1 → 0.6, fades. New chapter content |
| 0.4–0.7 | Proof: camera continues arc, different angle | New scene (case study or equivalent) |
| 0.7–1 | Conversion: camera returns toward center, pulls back | CTA section, tree or static visual |

**Technical:** Scroll source: `window.scrollY` or scroll container. Normalize to 0–1. Easing: `easeInOutCubic`. Throttle to 60fps. `prefers-reduced-motion` → instant camera jumps at chapter boundaries.

---

## 5. State Machine for Motion

### States

- **idle:** Passive, post-interaction calm.
- **engaged:** User controlling (pointer, scroll).
- **guided:** System-controlled narrative.
- **fallback:** Non-3D mode.

### Transitions

- `idle` → `engaged`: First pointer/scroll.
- `engaged` → `idle`: N seconds no input (e.g., 3s).
- `guided` → `engaged`: User interrupts.
- Any → `fallback`: Tier C, reduced-motion, WebGL fail.

### Motion by State

- **idle:** Minimal motion (slow float, subtle pulse).
- **engaged:** Full parallax, responsive.
- **guided:** Camera-driven, narrative pace.
- **fallback:** No 3D motion; 2D equivalents.

---

## 6. Reduced Motion

### Detection

```javascript
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

### Behavior

- Durations → 0 or near-0 (e.g., 50ms).
- Disable parallax.
- Instant camera jumps.
- No idle loops.
- Static images instead of video.

---

## 7. Microinteraction Specs

### Hover

- Scale: 1 → 1.05, 120ms ease-out.
- Or: emissive boost 0 → 0.3, 150ms.

### Click

- Scale: 1 → 0.95 → 1. Down 50ms, up 100ms.
- Optional: brief flash or particle burst.

### Focus (Keyboard)

- Same as hover for consistency.
- Ensure visible focus ring (outline) for accessibility.

---

## 8. Narrative Beat Timing

### Hero

- 0ms: Page load.
- 0–800ms: Initial content paint (HTML/CSS).
- 800–1200ms: 3D init, hero appears.
- 1200–2500ms: Hero intro animation.
- 2500ms: Primary CTA visible.

### Capability

- Each scene: 2–4s scroll duration for comfortable reading.
- CTA appears 1s after scene content visible.

### Conversion

- Pre-commit module: 3–5s to complete.
- Form: minimal friction, clear validation feedback.

---

*Use this guide with 00-MASTER-GUIDE.md Sections 1 and 5.*
