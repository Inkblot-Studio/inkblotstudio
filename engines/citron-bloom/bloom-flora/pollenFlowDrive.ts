import { smoothstep } from '../bloom-core/math';

export interface PollenFlowState {
  smoothGate: number;
  smoothAlong: number;
  /** Slower, wider scroll band so opacity eases in at the crown before motion reads loud */
  smoothOpacityAlong: number;
}

export interface PollenFlowResult {
  opacityTarget: number;
  burstTarget: number;
  driftScale: number;
  ambientScale: number;
}

export function createPollenFlowState(): PollenFlowState {
  return { smoothGate: 0, smoothAlong: 0, smoothOpacityAlong: 0 };
}

const GATE_SMOOTH = 6.0;
const ALONG_SMOOTH = 5.0;
const ALONG_OPACITY_SMOOTH = 2.85;

/**
 * Scroll/journey + bloom → smooth motion/opacity targets (no binary gates on drift/ambient).
 */
export function drivePollenFlow(
  state: PollenFlowState,
  delta: number,
  gate01: number,
  journeyProgress01: number,
  bloom01: number,
): PollenFlowResult {
  const p = Math.max(0, Math.min(1, journeyProgress01));
  const dt = Math.max(delta, 0.0001);
  const kG = 1 - Math.exp(-GATE_SMOOTH * dt);
  const kA = 1 - Math.exp(-ALONG_SMOOTH * dt);
  const kAo = 1 - Math.exp(-ALONG_OPACITY_SMOOTH * dt);
  state.smoothGate += (gate01 - state.smoothGate) * kG;

  const along = smoothstep(0.02, 0.38, p);
  state.smoothAlong += (along - state.smoothAlong) * kA;

  const opacityAlong = smoothstep(0.03, 0.42, p);
  state.smoothOpacityAlong += (opacityAlong - state.smoothOpacityAlong) * kAo;

  const depth = 0.46 + 0.54 * p;
  const bloomGate = 0.2 + 0.8 * bloom01;
  const motionCore = state.smoothGate * bloomGate * state.smoothAlong * depth;
  const opacityCore =
    state.smoothGate * bloomGate * state.smoothOpacityAlong * (0.38 + 0.62 * depth);
  const softVis = opacityCore * (0.72 + 0.28 * opacityCore);

  return {
    opacityTarget: Math.min(0.92, softVis * 0.94),
    burstTarget: motionCore * 0.9,
    driftScale: motionCore * (0.82 + 0.5 * p),
    ambientScale: motionCore * 0.8,
  };
}
