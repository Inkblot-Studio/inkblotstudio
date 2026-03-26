import { clamp, smoothstep } from '@/utils/math';

export const JOURNEY_SECTION_COUNT = 6;

/** Default desktop weights (sum arbitrary; normalized in resolve). */
/** Longer acts: flower, hero, portfolio, water, lab, closing flower. */
const JOURNEY_WEIGHTS_DEFAULT = [0.18, 0.16, 0.24, 0.18, 0.12, 0.12] as const;

export interface JourneyState {
  /** 0..5 */
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

/** Cumulative global stops: `[0, endS0, endS1, …, 1]` — length `JOURNEY_SECTION_COUNT + 1`. */
export function journeyCumulativeStops(
  weights: readonly number[] = getJourneySectionWeights(),
): number[] {
  return buildCumulative(weights);
}

/** Tunable weights: mobile and reduced-motion get alternate pacing. */
export function getJourneySectionWeights(): readonly number[] {
  if (typeof window === 'undefined') {
    return JOURNEY_WEIGHTS_DEFAULT;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
  }
  if (window.matchMedia('(max-width: 768px)').matches) {
    return [0.16, 0.14, 0.22, 0.17, 0.15, 0.16];
  }
  return JOURNEY_WEIGHTS_DEFAULT;
}

/**
 * Map global scroll progress [0,1] to section index and local progress.
 */
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

/**
 * Drives {@link CitronBloomComposer.setSceneTransition}: mix primary scene (flower + journey) with
 * the secondary “bloom transition” scene across the six journey acts.
 */
export function computeJourneyDualSceneBlend(j: JourneyState): number {
  const { section, localT } = j;
  if (section === 0) return smoothstep(0.2, 0.94, localT) * 0.44;
  /** Logo act: primary scene only — no secondary “transition” composite behind the hero. */
  if (section === 1) return 0;
  if (section === 2) {
    const ramp = smoothstep(0, 0.32, localT);
    return ramp * (0.74 - smoothstep(0, 1, localT) * 0.14);
  }
  if (section === 3) return 0.6 + smoothstep(0, 1, localT) * 0.22;
  if (section === 4) return 0.82;
  return 0.82 * (1 - smoothstep(0.12, 0.88, localT));
}

const SECTION_TRANSITION_EDGE = 0.2;

/**
 * 0 = stable act (no dual-scene warp / parallax swim / heavy film); 1 = at section in/out.
 * Used so journey reads calm mid-scroll and only “moves” when crossing acts.
 */
export function computeJourneySectionTransitionFx(j: JourneyState): number {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 0;
  }
  const { localT } = j;
  const atStart = 1 - smoothstep(0, SECTION_TRANSITION_EDGE, localT);
  const atEnd = smoothstep(1 - SECTION_TRANSITION_EDGE, 1, localT);
  return Math.max(atStart, atEnd);
}
