import type { Variants } from 'framer-motion';

const EASE_UP = [0.16, 1, 0.3, 1] as const;
const EASE_DOWN = [0.4, 0, 0.2, 1] as const;

/** Full overlay: minimal fade + nudge (reference: still sheet, not a flying panel). */
export function contactPageSky(reduce: boolean): Variants {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.2 } },
      exit: { opacity: 0, transition: { duration: 0.2 } },
    };
  }
  return {
    initial: { opacity: 0, y: 16 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: EASE_UP },
    },
    exit: {
      opacity: 0,
      y: 10,
      transition: { duration: 0.32, ease: EASE_DOWN },
    },
  };
}

export function contactPageMist(reduce: boolean): Variants {
  if (reduce) {
    return { initial: { opacity: 0 }, animate: { opacity: 0 }, exit: { opacity: 0 } };
  }
  return {
    initial: { opacity: 0 },
    animate: { opacity: 0.2, transition: { delay: 0.05, duration: 0.5, ease: EASE_UP } },
    exit: { opacity: 0, transition: { duration: 0.3, ease: EASE_DOWN } },
  };
}

/** Second “layer” — content eases in after the shell (no separate exit: parent `main` descends with everything). */
export function contactPageInner(reduce: boolean): Variants {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.2 } },
    };
  }
  return {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { delay: 0.04, duration: 0.5, ease: EASE_UP },
    },
  };
}
