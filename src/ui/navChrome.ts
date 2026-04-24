import { leaveContactToJourneySection, openContactFromNav } from '@/navigation/contactRouteBridge';
import type { AudioSystem } from '@/systems/audioSystem';
import { registerAudioForReactUI } from '@/ui/audioUIFeedbackRegistry';
import type { ScrollSystem } from '@/systems/scrollSystem';
import { initDrawerSlotTitles } from '@/ui/drawerSlotTitles';
import { navScrollToJourneyIndex, navScrollToWork } from '@/ui/portfolioNavigator';

let lastMiniPlayerSig = '';

function buildMiniTrackLine(audio: AudioSystem): string {
  const label = audio.getCurrentTrackLabel().trim();
  const artist = audio.getCurrentTrackArtist().trim();
  if (!label && !artist) return '—';
  if (!artist) return label;
  if (!label) return artist;
  return `${label}\u2009\u2013\u2009${artist}`;
}

function appendMarqueeSeg(track: HTMLElement, text: string, ariaHidden: boolean): void {
  const seg = document.createElement('span');
  seg.className = 'nav-mini-mq-seg';
  seg.textContent = text;
  if (ariaHidden) {
    seg.setAttribute('aria-hidden', 'true');
  }
  track.appendChild(seg);
}

function fillMarqueeRow(
  wrap: HTMLElement,
  view: HTMLElement,
  track: HTMLElement,
  line: string,
): void {
  wrap.classList.remove('nav-mini-mq-active');
  track.style.removeProperty('--mq-dur');
  track.innerHTML = '';

  appendMarqueeSeg(track, line, false);

  requestAnimationFrame(() => {
    const vw = view.clientWidth;
    const overflow = track.scrollWidth > vw + 2;
    if (overflow) {
      appendMarqueeSeg(track, line, true);
      const dur = Math.min(38, Math.max(8, (track.scrollWidth / Math.max(vw, 1)) * 5));
      track.style.setProperty('--mq-dur', `${dur}s`);
      wrap.classList.add('nav-mini-mq-active');
    }
  });
}

function updateMiniPlayerCredits(audio: AudioSystem): void {
  const line = buildMiniTrackLine(audio);
  if (line === lastMiniPlayerSig) return;
  lastMiniPlayerSig = line;

  const navMini = document.getElementById('nav-mini');
  if (navMini) {
    navMini.setAttribute('aria-label', `Now playing: ${line}`);
  }

  const titleView = document.getElementById('nav-mini-title-view');
  const titleTrack = document.getElementById('nav-mini-title-track');
  const wrapTitle = document.getElementById('nav-mini-wrap-title');
  if (!titleView || !titleTrack || !wrapTitle) {
    return;
  }

  fillMarqueeRow(wrapTitle, titleView, titleTrack, line);
}
let petalPulseSmoothed = 0.26;
/** Phase for slow idle wobble on the mini EQ. */
let adVizSwirl = 0;
const AD_BANDS = 8;
/** Smoothed 0..1 per-band levels (8-band spectrum in updateNavChrome). */
let adBars: number[] = [0.35, 0.36, 0.37, 0.38, 0.35, 0.36, 0.34, 0.35];

let drawerFocusReturn: HTMLElement | null = null;

/** Set by `initSiteDrawer` so opening contact (route) can close the menu. */
let closeSiteMenu: (() => void) | null = null;

let audioDockLiquidOpen = false;
let audioHoldTimer: number | null = null;
let audioAutoCloseTimer: number | null = null;
const HOLD_OPEN_MS = 400;
const LIQUID_AUTO_CLOSE_MS = 5200;

function initSiteDrawer(): void {
  const root = document.getElementById('site-drawer');
  const panel = document.getElementById('site-drawer-panel') as HTMLDivElement | null;
  const openBtn = document.getElementById('site-drawer-open');
  const backdrop = document.getElementById('site-drawer-backdrop');
  if (!root || !panel || !openBtn) return;

  const linkIndex = document.getElementById('drawer-link-index');
  const linkWork = document.getElementById('drawer-link-work');

  const isOpen = () => root.classList.contains('site-drawer--open');
  /** True while the drawer is open or finishing its close animation (body keeps chrome stacking). */
  const isDrawerStackedOverScene = () => document.body.classList.contains('site-drawer-open');

  let closeUnlockTimer: number | null = null;

  const finishDrawerCloseUnlock = (): void => {
    if (closeUnlockTimer != null) {
      window.clearTimeout(closeUnlockTimer);
      closeUnlockTimer = null;
    }
    panel.removeEventListener('transitionend', onPanelCloseEnd);
    if (isOpen()) return;
    if (!document.body.classList.contains('site-drawer-open')) return;
    document.body.classList.remove('site-drawer-open', 'site-drawer-toggle-on');
    if (!document.body.classList.contains('contact-page-open')) {
      document.body.style.overflow = '';
    }
    if (drawerFocusReturn) {
      drawerFocusReturn.focus();
      drawerFocusReturn = null;
    } else {
      openBtn.focus();
    }
  };

  const onPanelCloseEnd = (e: TransitionEvent): void => {
    if (e.target !== panel || e.propertyName !== 'transform') return;
    finishDrawerCloseUnlock();
  };

  const getFocusable = (): HTMLElement[] => {
    const raw = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    return raw.filter((el) => {
      if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      const st = getComputedStyle(el);
      return st.display !== 'none' && st.visibility !== 'hidden';
    });
  };

  const setOpen = (open: boolean): void => {
    if (open) {
      panel.removeEventListener('transitionend', onPanelCloseEnd);
      if (closeUnlockTimer != null) {
        window.clearTimeout(closeUnlockTimer);
        closeUnlockTimer = null;
      }
      if (!isOpen()) {
        drawerFocusReturn = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
      root.classList.add('site-drawer--open');
      root.setAttribute('aria-hidden', 'false');
      openBtn.setAttribute('aria-expanded', 'true');
      openBtn.setAttribute('aria-label', 'Close site menu');
      document.body.classList.add('site-drawer-open', 'site-drawer-toggle-on');
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        const first = getFocusable()[0];
        (first ?? panel).focus();
      });
    } else {
      if (!isOpen()) return;
      // Hamburger back to white/+ immediately; z-index stays via `site-drawer-open` until panel ends.
      document.body.classList.remove('site-drawer-toggle-on');
      root.classList.remove('site-drawer--open');
      root.setAttribute('aria-hidden', 'true');
      openBtn.setAttribute('aria-expanded', 'false');
      openBtn.setAttribute('aria-label', 'Open site menu');
      // Keep `body.site-drawer-open` and overflow lock until the panel slide + blur finish
      // so #ui-layer stays above the overlay and the scene doesn’t “pop” by stacking order.
      panel.addEventListener('transitionend', onPanelCloseEnd);
      closeUnlockTimer = window.setTimeout(finishDrawerCloseUnlock, 950);
    }
  };

  const closeIfOpen = (): void => {
    if (isOpen()) setOpen(false);
  };

  openBtn.addEventListener('click', () => {
    if (isOpen()) closeIfOpen();
    else setOpen(true);
  });
  backdrop?.addEventListener('click', () => closeIfOpen());

  const onLinkNav = (e: Event, fn: () => void): void => {
    e.preventDefault();
    fn();
    closeIfOpen();
  };

  linkIndex?.addEventListener('click', (e) =>
    onLinkNav(e, () => {
      if (document.body.classList.contains('contact-page-open')) {
        leaveContactToJourneySection('index');
      } else {
        navScrollToJourneyIndex();
      }
    }),
  );
  linkWork?.addEventListener('click', (e) =>
    onLinkNav(e, () => {
      if (document.body.classList.contains('contact-page-open')) {
        leaveContactToJourneySection('work');
      } else {
        navScrollToWork();
      }
    }),
  );

  document.getElementById('drawer-mailto')?.addEventListener('click', () => {
    closeIfOpen();
  });

  root.addEventListener('click', (e) => {
    if ((e.target as Element | null)?.closest?.('.site-drawer__socials a[href]')) {
      closeIfOpen();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isOpen()) return;
    e.preventDefault();
    closeIfOpen();
  });

  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || (!isOpen() && !isDrawerStackedOverScene())) return;
    const list = getFocusable();
    if (list.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    const i = active ? list.indexOf(active) : -1;
    if (e.shiftKey) {
      if (i <= 0) {
        e.preventDefault();
        list[list.length - 1]!.focus();
      }
    } else if (i === -1 || i === list.length - 1) {
      e.preventDefault();
      list[0]!.focus();
    }
  });

  closeSiteMenu = closeIfOpen;
}

/**
 * Top nav and drawer: open the `/contact` route (see `ContactPage` + `contactRouteBridge`).
 */
function initContactNavLinks(): void {
  document.getElementById('nav-link-contact')?.addEventListener('click', (e) => {
    e.preventDefault();
    openContactFromNav();
  });
  document.getElementById('drawer-link-contact')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeSiteMenu?.();
    openContactFromNav();
  });
}

function clearAudioAutoClose(): void {
  if (audioAutoCloseTimer) {
    window.clearTimeout(audioAutoCloseTimer);
    audioAutoCloseTimer = null;
  }
}

function updateMiniPlayerOpenA11y(): void {
  const w = document.getElementById('nav-player-wrap');
  if (w) {
    w.setAttribute('aria-hidden', (!audioDockLiquidOpen).toString());
  }
}

function openAudioLiquid(): void {
  document.getElementById('audio-dock')?.classList.add('audio-dock--liquid');
  audioDockLiquidOpen = true;
  updateMiniPlayerOpenA11y();
  clearAudioAutoClose();
  audioAutoCloseTimer = window.setTimeout(() => {
    closeAudioLiquid();
  }, LIQUID_AUTO_CLOSE_MS);
}

function closeAudioLiquid(): void {
  document.getElementById('audio-dock')?.classList.remove('audio-dock--liquid');
  audioDockLiquidOpen = false;
  clearAudioAutoClose();
  updateMiniPlayerOpenA11y();
}

function scheduleLiquidAfterActivity(): void {
  if (!audioDockLiquidOpen) return;
  clearAudioAutoClose();
  audioAutoCloseTimer = window.setTimeout(() => {
    closeAudioLiquid();
  }, LIQUID_AUTO_CLOSE_MS);
}

/**
 * Play/pause = quick click. Hold ~400ms opens the liquid track strip; it re-collapses
 * after ~5s, on quick click the button when open, or after prev/next.
 */
function initAudioDockControls(audio: AudioSystem): void {
  const btn = document.getElementById('nav-audio-toggle');
  const wrap = document.getElementById('nav-player-wrap');
  if (!btn) return;

  let holdOpened = false;

  const clearHold = (): void => {
    if (audioHoldTimer) {
      window.clearTimeout(audioHoldTimer);
      audioHoldTimer = null;
    }
  };

  const onShort = (): void => {
    if (audioDockLiquidOpen) {
      closeAudioLiquid();
    } else {
      void audio.toggleAudio();
    }
  };

  btn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (audioDockLiquidOpen) {
      scheduleLiquidAfterActivity();
      return;
    }
    holdOpened = false;
    clearHold();
    audioHoldTimer = window.setTimeout(() => {
      audioHoldTimer = null;
      holdOpened = true;
      if (!audioDockLiquidOpen) openAudioLiquid();
    }, HOLD_OPEN_MS);
  });

  btn.addEventListener('pointerup', (e) => {
    if (e.button !== 0) return;
    clearHold();
  });

  btn.addEventListener('pointercancel', clearHold);

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (holdOpened) {
      holdOpened = false;
      return;
    }
    onShort();
  });

  for (const id of ['nav-mini-prev', 'nav-mini-next'] as const) {
    document.getElementById(id)?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (audioDockLiquidOpen) scheduleLiquidAfterActivity();
    });
  }

  wrap?.addEventListener('pointerenter', () => {
    if (audioDockLiquidOpen) scheduleLiquidAfterActivity();
  });

  /** Click the track strip (not prev/next) to play or pause. */
  wrap?.addEventListener('click', (e) => {
    if (!audioDockLiquidOpen) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    void audio.toggleAudio();
    scheduleLiquidAfterActivity();
  });
}

export function initNavChrome(audio: AudioSystem): void {
  registerAudioForReactUI(audio);
  const onNavIndex = (e: Event) => {
    e.preventDefault();
    if (document.body.classList.contains('contact-page-open')) {
      leaveContactToJourneySection('index');
    } else {
      navScrollToJourneyIndex();
    }
  };
  const onNavWork = (e: Event) => {
    e.preventDefault();
    if (document.body.classList.contains('contact-page-open')) {
      leaveContactToJourneySection('work');
    } else {
      navScrollToWork();
    }
  };
  document.getElementById('nav-brand-home')?.addEventListener('click', onNavIndex);
  document.getElementById('nav-link-index')?.addEventListener('click', onNavIndex);
  document.getElementById('nav-link-work')?.addEventListener('click', onNavWork);
  document.getElementById('nav-mini-prev')?.addEventListener('click', (e) => {
    e.preventDefault();
    audio.prevTrack();
  });
  document.getElementById('nav-mini-next')?.addEventListener('click', (e) => {
    e.preventDefault();
    audio.nextTrack();
  });

  initAudioDockControls(audio);
  initSiteDrawer();
  initContactNavLinks();
  initDrawerSlotTitles();

  window.addEventListener('resize', () => {
    lastMiniPlayerSig = '';
  });
}

/** Syncs pill thumb height + position to document scroll (native bar hidden). */
export function updateCustomScrollThumb(): void {
  const track = document.getElementById('custom-scroll-track');
  const thumb = document.getElementById('custom-scroll-thumb');
  if (!track || !thumb) return;

  const docH = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  );
  const vh = window.innerHeight;
  const maxScroll = Math.max(docH - vh, 1);
  const scrollY = window.scrollY || window.pageYOffset;

  if (maxScroll <= 4) {
    thumb.style.opacity = '0';
    return;
  }

  thumb.style.opacity = '1';

  const trackH = track.clientHeight;
  const ratio = vh / docH;
  // Long pages → small thumb; keep a modest floor so it stays grabbable.
  const thumbH = Math.max(Math.round(trackH * ratio), 20);
  const cappedThumb = Math.min(thumbH, Math.floor(trackH * 0.88));
  const travel = Math.max(trackH - cappedThumb, 0);
  const p = Math.min(Math.max(scrollY / maxScroll, 0), 1);
  const y = p * travel;

  thumb.style.height = `${cappedThumb}px`;
  thumb.style.transform = `translateY(${y}px)`;
}

export function updateNavChrome(
  audio: AudioSystem,
  scroll: ScrollSystem,
  delta: number,
): void {
  const root = document.documentElement;
  const warp = Math.min(scroll.velocityPxPerSec / 3800, 1);
  root.style.setProperty('--nav-warp', warp.toFixed(4));
  root.style.setProperty('--nav-dir', String(scroll.scrollDirection));
  document.body.classList.toggle('audio-active', audio.isPlaying);
  document.body.classList.toggle('music-playing', audio.isPlaying);

  const playerWrap = document.getElementById('nav-player-wrap');
  if (playerWrap) {
    playerWrap.setAttribute('aria-hidden', (!audioDockLiquidOpen).toString());
  }

  const audioToggle = document.getElementById('nav-audio-toggle');
  const d = Math.min(Math.max(delta, 0), 0.05);
  if (audioToggle) {
    audioToggle.setAttribute('aria-pressed', audio.isPlaying ? 'true' : 'false');
    if (audio.isPlaying) {
      const rawPetal = Math.min(
        1,
        0.18 +
          audio.lowFrequencyVolume * 0.68 +
          audio.beatEnvelope * 0.92 +
          audio.highFrequencyVolume * 0.16,
      );
      petalPulseSmoothed += (rawPetal - petalPulseSmoothed) * Math.min(1, d * 14);
    } else {
      petalPulseSmoothed += (0.24 - petalPulseSmoothed) * Math.min(1, d * 8);
    }
    audioToggle.style.setProperty('--nav-petal-pulse', petalPulseSmoothed.toFixed(3));
    const lf = audio.lowFrequencyVolume;
    const hf = audio.highFrequencyVolume;
    const b = audio.beatEnvelope;
    const p = petalPulseSmoothed;
    const playing = audio.isPlaying;
    adVizSwirl = (adVizSwirl + d * 0.55) % 62.83;
    const t = adVizSwirl;
    const aBar = 1 - Math.exp(-2.6 * d);
    const s8 = audio.spectrum8;
    for (let i = 0; i < AD_BANDS; i++) {
      let u: number;
      if (playing) {
        const raw = s8[i] ?? 0;
        u =
          0.08 +
          0.9 *
            Math.min(
              1,
              raw * (0.92 + 0.08 * (i + 1) * 0.12) +
                (i < 2 ? 0.12 * lf : 0) +
                (i >= 2 && i <= 4 ? 0.1 * p : 0) +
                (i > 4 ? 0.1 * hf : 0) +
                (i >= 5 ? 0.08 * b : 0),
            );
      } else {
        u = 0.2 + 0.15 * Math.sin(t * 0.42 + i * 0.45 + (i & 1) * 0.2);
      }
      u = Math.min(0.99, Math.max(0.08, u));
      adBars[i] += (u - adBars[i]!) * aBar;
      audioToggle.style.setProperty(`--ad-b${i}`, adBars[i]!.toFixed(3));
    }
  }

  updateMiniPlayerCredits(audio);

  updateCustomScrollThumb();
}
