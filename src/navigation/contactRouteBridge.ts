import type { NavigateFunction } from 'react-router-dom';

import { navScrollToJourneyIndex, navScrollToWork } from '@/ui/portfolioNavigator';

let boundNavigate: NavigateFunction | null = null;
/** Y position (px) in the main document to restore when leaving /contact, if opened from the journey. */
let savedJourneyScrollY: number | null = null;
/** True when the user used in-site nav to /contact (not a direct /contact visit). */
let openedWithScrollCapture = false;
/** When set, `restoreScrollAfterContact` scrolls to this section instead of restoring Y. */
let pendingJourneyAfterClose: 'index' | 'work' | null = null;

const prefersReducedScrollMotion = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const SCROLL_TO_TOP_TOL = 1.2;
const SCROLL_MAX_WAIT_MS = 1100;

function scrollDocumentToTopThen(after: () => void): void {
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  if (y < 0.5) {
    after();
    return;
  }
  if (prefersReducedScrollMotion()) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    queueMicrotask(after);
    return;
  }
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    window.removeEventListener('scrollend', onScrollEnd);
    after();
  };
  const onScrollEnd = () => run();
  window.addEventListener('scrollend', onScrollEnd, { passive: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const t0 = performance.now();
  const check = () => {
    if (done) return;
    const yNow = window.scrollY || document.documentElement.scrollTop || 0;
    if (yNow < SCROLL_TO_TOP_TOL) {
      run();
      return;
    }
    if (performance.now() - t0 > SCROLL_MAX_WAIT_MS) {
      run();
      return;
    }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}

export function registerContactRouteNavigate(fn: NavigateFunction): void {
  boundNavigate = fn;
}

/**
 * Open `/contact` from the shell (top nav or drawer). Saves scroll, scrolls to top, navigates.
 */
export function openContactFromNav(): void {
  if (!boundNavigate) {
    window.location.assign('/contact');
    return;
  }
  openedWithScrollCapture = true;
  savedJourneyScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  scrollDocumentToTopThen(() => {
    boundNavigate!('/contact');
  });
}

/**
 * When ContactPage unmounts, restore journey scroll or a sensible default.
 */
export function restoreScrollAfterContact(): void {
  if (pendingJourneyAfterClose === 'index') {
    pendingJourneyAfterClose = null;
    openedWithScrollCapture = false;
    savedJourneyScrollY = null;
    requestAnimationFrame(() => navScrollToJourneyIndex());
    return;
  }
  if (pendingJourneyAfterClose === 'work') {
    pendingJourneyAfterClose = null;
    openedWithScrollCapture = false;
    savedJourneyScrollY = null;
    requestAnimationFrame(() => navScrollToWork());
    return;
  }
  if (openedWithScrollCapture && savedJourneyScrollY != null) {
    const y = Math.max(0, savedJourneyScrollY);
    openedWithScrollCapture = false;
    savedJourneyScrollY = null;
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
    return;
  }
  openedWithScrollCapture = false;
  savedJourneyScrollY = null;
  requestAnimationFrame(() => {
    navScrollToJourneyIndex();
  });
}

/**
 * Leave `/contact` and land on the journey (replaces history). Used from top nav when the contact sheet is open.
 */
export function leaveContactToJourneySection(section: 'index' | 'work'): void {
  if (!boundNavigate) {
    window.location.assign('/');
    return;
  }
  pendingJourneyAfterClose = section;
  openedWithScrollCapture = false;
  savedJourneyScrollY = null;
  boundNavigate('/', { replace: true });
}

/**
 * Close /contact: Back when opened from the journey; otherwise replace to home.
 * Scroll restore runs in `ContactPage` unmount.
 */
export function closeContactAndRestore(): void {
  if (!boundNavigate) {
    window.location.assign('/');
    return;
  }
  if (openedWithScrollCapture) {
    boundNavigate(-1);
  } else {
    boundNavigate('/', { replace: true });
  }
}
