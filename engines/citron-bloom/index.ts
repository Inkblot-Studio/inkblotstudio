/**
 * Citron Bloom — self-contained Three.js engine (`bloom-*` modules).
 *
 * - **Embedded**: {@link CitronBloomEngineHost} + your `Scene` / `WebGLRenderer` / `Camera` (Inkblot path).
 * - **Standalone**: {@link createCitronBloomShell} for a minimal full stack in one call.
 */
export * from './bloom-core';
export * from './bloom-curves';
export * from './bloom-flora';
export * from './bloom-particle-env';
export * from './bloom-particles';
export * from './bloom-postprocess';
export * from './bloom-runtime';
export * from './bloom-showcase';
export * from './examples/createCitronBloomScene';
