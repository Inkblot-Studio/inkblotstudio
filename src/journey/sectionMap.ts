import { clamp, smoothstep } from '@/utils/math';

export const JOURNEY_SECTION_COUNT = 2;

/** Flower intro → work / portfolio (DOM + Framer only, no extra 3D layer). */
const JOURNEY_WEIGHTS_DEFAULT = [0.5, 0.5] as const;

export interface JourneyState {
  /** 0..1 */
  readonly section: number;
  /** Progress within current section [0, 1] */
  readonly localT: number;
  /** Global scroll [0, 1] */
  readonly globalT: number;
  /** Normalized start of current section on global timeline */
  readonly sectionStart: number;
  /** Normalized end of current section on global timeline */
  readonly sectionEnd: number;
}

function buildCumulative(weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const cumulative: number[] = [0];
  let acc = 0;
  for (const w of weights) {
    acc += w / sum;
    cumulative.push(acc);
  }
  cumulative[cumulative.length - 1] = 1;
  return cumulative;
}

export function journeyCumulativeStops(
  weights: readonly number[] = getJourneySectionWeights(),
): number[] {
  return buildCumulative(weights);
}

export function getJourneySectionWeights(): readonly number[] {
  if (typeof window === 'undefined') {
    return JOURNEY_WEIGHTS_DEFAULT;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return [0.5, 0.5];
  }
  if (window.matchMedia('(max-width: 768px)').matches) {
    return [0.48, 0.52];
  }
  return JOURNEY_WEIGHTS_DEFAULT;
}

export function resolveJourney(
  globalT: number,
  weights: readonly number[] = getJourneySectionWeights(),
): JourneyState {
  const g = clamp(globalT, 0, 1);
  const cumulative = buildCumulative(weights);
  let section = JOURNEY_SECTION_COUNT - 1;
  for (let i = 0; i < JOURNEY_SECTION_COUNT; i++) {
    if (g < cumulative[i + 1] - 1e-9) {
      section = i;
      break;
    }
  }
  const start = cumulative[section];
  const end = cumulative[section + 1];
  const span = Math.max(end - start, 1e-6);
  const localT = clamp((g - start) / span, 0, 1);
  return {
    section,
    localT,
    globalT: g,
    sectionStart: start,
    sectionEnd: end,
  };
}

const SECTION_TRANSITION_EDGE = 0.24;

export function computeJourneySectionTransitionFx(j: JourneyState): number {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 0;
  }
  const { localT } = j;
  const atStart = 1 - smoothstep(0, SECTION_TRANSITION_EDGE, localT);
  const atEnd = smoothstep(1 - SECTION_TRANSITION_EDGE, 1, localT);
  return Math.max(atStart, atEnd);
}
