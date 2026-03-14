# 3D WebGL / WebGPU Implementation Guide

A comprehensive, AI-incorporatable guide for building breathtaking 3D web experiences with WebGL, Three.js, and WebGPU.

## Purpose

This guide set is designed for:

- **Developers** implementing immersive 3D UI flows
- **AI assistants** incorporating best practices into generated code
- **Teams** aligning on architecture, performance, and creative standards

## Document Index

| Document | Lines | Focus |
|----------|-------|-------|
| [00-MASTER-GUIDE.md](./00-MASTER-GUIDE.md) | ~840 | Vision, stack, architecture, all sections overview |
| [01-SCENE-ARCHITECTURE-GUIDE.md](./01-SCENE-ARCHITECTURE-GUIDE.md) | ~280 | Scene graph, chapters, layers, composition |
| [02-INTERACTION-INPUT-GUIDE.md](./02-INTERACTION-INPUT-GUIDE.md) | ~280 | Pointer, raycasting, scroll, touch, a11y |
| [03-PERFORMANCE-OPTIMIZATION-GUIDE.md](./03-PERFORMANCE-OPTIMIZATION-GUIDE.md) | ~280 | Budgets, adaptive quality, LOD, memory |
| [04-SHADERS-MATERIALS-GUIDE.md](./04-SHADERS-MATERIALS-GUIDE.md) | ~220 | PBR, shaders, lighting, post-processing |
| [05-CREATIVE-MOTION-GUIDE.md](./05-CREATIVE-MOTION-GUIDE.md) | ~220 | Motion design, easing, narrative beats |
| [06-WEBGPU-GUIDE.md](./06-WEBGPU-GUIDE.md) | ~180 | WebGPU detection, migration, compute |
| [07-ASSET-LOADING-GUIDE.md](./07-ASSET-LOADING-GUIDE.md) | ~240 | Models, textures, preload, error handling |
| [08-INTEGRATION-CODE-PATTERNS-GUIDE.md](./08-INTEGRATION-CODE-PATTERNS-GUIDE.md) | ~260 | R3F, React, Astro, cleanup, structure |
| [09-VISUAL-REFERENCE-ACTIVETHEORY-BEYOND.md](./09-VISUAL-REFERENCE-ACTIVETHEORY-BEYOND.md) | ~250 | Activetheory analysis, colors, theme config, font stack |
| [10-LOADING-SCREEN-GUIDE.md](./10-LOADING-SCREEN-GUIDE.md) | ~120 | Loading screen layout, progress, timing, styling |

**Total: 2300+ lines**

## How to Use

1. **Start with** [00-MASTER-GUIDE.md](./00-MASTER-GUIDE.md) for the full picture.
2. **Dive into** section guides when implementing specific areas.
3. **Reference** decision checklists and quick-reference appendices in the master guide.
4. **For AI:** Use the "For AI" callouts and pseudo-code patterns as implementation templates.

## Key Principles

- **Content first** — 3D enhances, never replaces
- **Performance by design** — tiered quality, graceful degradation
- **Accessibility parity** — fallbacks preserve message and conversion
- **One motion, one intention** — every animation serves the narrative

## Related Docs

- [Interactive 3D Creative Spec](../interactive-3d-master-plan/11-interactive-3d-creative-spec.md)
- [Performance Tech Blueprint](../interactive-3d-master-plan/05-performance-tech-blueprint.md)
- [Interaction Concepts](../interactive-3d-master-plan/04-interaction-concepts-3d.md)
