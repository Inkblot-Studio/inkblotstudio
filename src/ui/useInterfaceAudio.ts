import { useCallback, useRef } from 'react';

import { getAudioForReactUI } from '@/ui/audioUIFeedbackRegistry';

const HOVER_MIN_MS = 100;

/**
 * Plays very quiet UI SFX when the score is on (`AudioSystem.isPlaying`); no-op if audio is off.
 * Respects `prefers-reduced-motion` (no SFX) for a calmer, accessible mix.
 */
export function useInterfaceAudio() {
  const lastHover = useRef(0);

  const playHover = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const t = performance.now();
    if (t - lastHover.current < HOVER_MIN_MS) return;
    lastHover.current = t;
    getAudioForReactUI()?.playInterfaceHover();
  }, []);

  const playClick = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    getAudioForReactUI()?.playInterfaceClick();
  }, []);

  return { playHover, playClick };
}
