import { clamp } from '@/utils/math';
import {
  getJourneySectionWeights,
  journeyCumulativeStops,
} from '@/journey/sectionMap';

type ScrollToProgress = (progress01: number) => void;

let scrollImpl: ScrollToProgress | null = null;

/** Called from the runtime once `ScrollSystem` exists (flower journey scroll). */
export function registerPortfolioScrollNavigator(fn: ScrollToProgress): void {
  scrollImpl = fn;
}

export function clearPortfolioScrollNavigator(): void {
  scrollImpl = null;
}

function progressAtSectionStart(section: number, inset = 0.035): number {
  const stops = journeyCumulativeStops(getJourneySectionWeights());
  const s = Math.floor(clamp(section, 0, 5));
  return clamp((stops[s] ?? 0) + inset, 0, 0.996);
}

/**
 * Lightweight command parser (Active Theory–style “chat navigates the site”).
 * Extend with your API when `VITE_PORTFOLIO_CHAT_URL` is set.
 */
export function handlePortfolioChatQuery(raw: string): { reply: string; scrolled: boolean } {
  const q = raw.trim().toLowerCase();
  if (!q) {
    return { reply: '', scrolled: false };
  }

  if (!scrollImpl) {
    return {
      reply: 'Scene is still loading — try again in a moment.',
      scrolled: false,
    };
  }

  if (/^(hi|hello|hey)\b/.test(q)) {
    return {
      reply:
        'You can say: “show me the flower”, “take me to work”, “water”, “the lab”, or “finale”. Try “help” for more.',
      scrolled: false,
    };
  }

  if (/\b(help|commands|\?)\b/.test(q) || /what can (you|i)/.test(q)) {
    return {
      reply:
        'Destinations: flower · hero / logo · work / portfolio · water · lab · end / finale · top. For the glass showcase orbit, open with ?experience=stomp on the URL.',
      scrolled: false,
    };
  }

  if (/\b(top|home|start over)\b/.test(q)) {
    scrollImpl(0.02);
    return { reply: 'Back to the top of the journey.', scrolled: true };
  }

  if (/\b(flower|bloom|opening)\b/.test(q)) {
    scrollImpl(progressAtSectionStart(0, 0.02));
    return { reply: 'Moving to the bloom…', scrolled: true };
  }

  if (/\b(hero|logo|glass)\b/.test(q)) {
    scrollImpl(progressAtSectionStart(1, 0.04));
    return { reply: 'Sliding to the hero…', scrolled: true };
  }

  if (/\b(work|portfolio|projects?|carousel)\b/.test(q)) {
    scrollImpl(progressAtSectionStart(2, 0.05));
    return { reply: 'Opening the work arc…', scrolled: true };
  }

  if (/\b(water|cathedral|reflection)\b/.test(q)) {
    scrollImpl(progressAtSectionStart(3, 0.05));
    return { reply: 'Drifting to the water act…', scrolled: true };
  }

  if (/\b(lab|labs|r\s*&\s*d|research|prototype)\b/.test(q)) {
    scrollImpl(progressAtSectionStart(4, 0.05));
    return { reply: 'Heading to the lab…', scrolled: true };
  }

  if (/\b(end|finale|closing|outro)\b/.test(q)) {
    scrollImpl(progressAtSectionStart(5, 0.06));
    return { reply: 'Closing movement…', scrolled: true };
  }

  if (/\b(fun|cool|best)\b/.test(q) && /\b(project|work|show)\b/.test(q)) {
    scrollImpl(progressAtSectionStart(2, 0.12));
    return { reply: 'Here’s the work reel — scroll the carousel in-scene.', scrolled: true };
  }

  if (/\b(stomp|showcase|orbit)\b/.test(q)) {
    return {
      reply:
        'That experience uses ?experience=stomp — add it to the URL (Citron Bloom mode) for the orbit showcase.',
      scrolled: false,
    };
  }

  return {
    reply:
      'I didn’t catch a destination. Try “flower”, “work”, “water”, “lab”, or “help”.',
    scrolled: false,
  };
}
