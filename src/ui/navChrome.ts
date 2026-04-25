import { leaveContactToJourneySection, openContactFromNav } from '@/navigation/contactRouteBridge';
import type { AudioSystem } from '@/systems/audioSystem';
import { registerAudioForReactUI } from '@/ui/audioUIFeedbackRegistry';
import type { ScrollSystem } from '@/systems/scrollSystem';
import { playAudioDockUiSound } from '@/ui/audioUiSounds';
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

/** Phase for idle EQ motion (rad / frame). */
let audioWavePhase = 0;
/** 0 = paused look, 1 = full live spectrum blend — eases play/pause. */
let audioPlaybackMorph = 0;

/** 128×128 viewBox, drawn ~30px in CSS. */
const WAVE_UNIT = 128;

/** Equalizer bars only — paused = equal heights, playing = spectrum; stagger + ease on morph. */
const EQ_COUNT = 3;
/** Baseline y — placed so the bar stack sits nearer vertical center of the 128 viewBox in the round button. */
const EQ_BOTTOM = 88;
const EQ_BAR_W = 13;
const EQ_GAP = 9;
const EQ_RX = 5.5;
const EQ_H_MIN = 24;
const EQ_H_MAX = 78;
const EQ_CLUSTER_W = EQ_COUNT * EQ_BAR_W + (EQ_COUNT - 1) * EQ_GAP;
const EQ_X0 = (WAVE_UNIT - EQ_CLUSTER_W) * 0.5;
/** Per-bar delay factor for play/pause transition (0 = simultaneous). */
const EQ_STAGGER = 0.07;

/** Smoothed bar heights in [0, 1] for stable, readable motion. */
let eqBarNorm: number[] = [0.38, 0.38, 0.38];

function easeOutCubic(t: number): number {
  const u = 1 - Math.max(0, Math.min(1, t));
  return 1 - u * u * u;
}

function spectrumSliceAvg(spectrum: readonly number[], from: number, to: number): number {
  let sum = 0;
  let n = 0;
  for (let j = from; j <= to; j++) {
    sum += spectrum[j] ?? 0;
    n++;
  }
  return n > 0 ? sum / n : 0;
}

/** Three bands across eight bins: lows, mids, highs. */
function barLiveRaw(morphedS8: readonly number[], i: number): number {
  if (i === 0) return spectrumSliceAvg(morphedS8, 0, 2);
  if (i === 1) return spectrumSliceAvg(morphedS8, 3, 4);
  return spectrumSliceAvg(morphedS8, 5, 7);
}

function staggeredMorph(playbackMorph: number, barIndex: number, reduceMotion: boolean): number {
  if (reduceMotion) return playbackMorph;
  const span = 1 - (EQ_COUNT - 1) * EQ_STAGGER;
  if (span <= 1e-6) return playbackMorph;
  return Math.min(1, Math.max(0, (playbackMorph - barIndex * EQ_STAGGER) / span));
}

function buildRoundedBarPath(x: number, bottomY: number, w: number, height: number, rx: number): string {
  const h = Math.max(height, EQ_H_MIN * 0.65);
  const top = bottomY - h;
  const r = Math.min(rx, w * 0.48, h * 0.42);
  const x1 = x + w;
  return [
    `M ${x.toFixed(2)} ${bottomY}`,
    `L ${x.toFixed(2)} ${(top + r).toFixed(2)}`,
    `Q ${x.toFixed(2)} ${top.toFixed(2)} ${(x + r).toFixed(2)} ${top.toFixed(2)}`,
    `L ${(x1 - r).toFixed(2)} ${top.toFixed(2)}`,
    `Q ${x1.toFixed(2)} ${top.toFixed(2)} ${x1.toFixed(2)} ${(top + r).toFixed(2)}`,
    `L ${x1.toFixed(2)} ${bottomY}`,
    'Z',
  ].join(' ');
}

function eqBarTargetNorm(
  i: number,
  morphedS8: readonly number[],
  playbackMorph: number,
  phase: number,
  reduceMotion: boolean,
  isPlaying: boolean,
): number {
  const liveRaw = barLiveRaw(morphedS8, i);
  const live = 0.18 + 0.82 * Math.pow(Math.min(1, liveRaw * 1.12), 0.58);

  if (reduceMotion) {
    const idle = isPlaying ? 0.38 : 0.38;
    const blend = easeOutCubic(playbackMorph);
    return idle * (1 - blend) + live * blend;
  }

  const idle = 0.38 + 0.02 * Math.sin(phase * 0.48 + i * 0.9);
  const morphI = staggeredMorph(playbackMorph, i, false);
  const blend = easeOutCubic(morphI);
  return idle * (1 - blend) + live * blend;
}

function updateAudioEqBars(
  delta: number,
  morphedS8: readonly number[],
  playbackMorph: number,
  phase: number,
  reduceMotion: boolean,
  isPlaying: boolean,
): void {
  const smoothRate = reduceMotion ? 26 : 11;
  const k = 1 - Math.exp(-delta * smoothRate);

  for (let i = 0; i < EQ_COUNT; i++) {
    const target = eqBarTargetNorm(i, morphedS8, playbackMorph, phase, reduceMotion, isPlaying);
    eqBarNorm[i] += (target - eqBarNorm[i]) * k;
    eqBarNorm[i] = Math.min(1, Math.max(0, eqBarNorm[i]));
  }

  const els = [
    document.getElementById('nav-audio-eq-0'),
    document.getElementById('nav-audio-eq-1'),
    document.getElementById('nav-audio-eq-2'),
  ];
  for (let i = 0; i < EQ_COUNT; i++) {
    const el = els[i];
    if (!el) continue;
    const x = EQ_X0 + i * (EQ_BAR_W + EQ_GAP);
    const h = EQ_H_MIN + (EQ_H_MAX - EQ_H_MIN) * eqBarNorm[i]!;
    el.setAttribute('d', buildRoundedBarPath(x, EQ_BOTTOM, EQ_BAR_W, h, EQ_RX));
  }
}

let drawerFocusReturn: HTMLElement | null = null;

/** Set by `initSiteDrawer` so opening contact (route) can close the menu. */
let closeSiteMenu: (() => void) | null = null;

let audioDockLiquidOpen = false;
let audioHoldTimer: number | null = null;
let audioAutoCloseTimer: number | null = null;
let audioLiquidOutsideAttachTimer: number | null = null;
const HOLD_OPEN_MS = 400;
const LIQUID_AUTO_CLOSE_MS = 5200;

/**
 * Top nav pills: wrap label into per-letter spans (serif swap staggered last→first).
 */
function initNavTextLinkMicroInteractions(): void {
  const links = document.querySelectorAll<HTMLElement>('.nav-text-cluster .nav-text-link');
  for (const link of links) {
    const sans = link.querySelector<HTMLElement>('.nav-text-link__row--sans');
    const serif = link.querySelector<HTMLElement>('.nav-text-link__row--serif');
    if (!sans || !serif) continue;

    if (!sans.querySelector('.nav-text-link__ch')) {
      const text = (sans.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const chars = [...text];
      const n = chars.length;
      sans.replaceChildren();
      serif.replaceChildren();
      for (let i = 0; i < n; i++) {
        const li = n - 1 - i;
        const mk = (ch: string) => {
          const s = document.createElement('span');
          s.className = 'nav-text-link__ch';
          s.setAttribute('aria-hidden', 'true');
          s.style.setProperty('--li', String(li));
          s.textContent = ch;
          return s;
        };
        sans.appendChild(mk(chars[i] ?? ''));
        serif.appendChild(mk(chars[i] ?? ''));
      }
    }
  }
}

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

function detachAudioLiquidOutsidePointer(): void {
  if (audioLiquidOutsideAttachTimer !== null) {
    window.clearTimeout(audioLiquidOutsideAttachTimer);
    audioLiquidOutsideAttachTimer = null;
  }
  window.removeEventListener('pointerdown', onAudioLiquidOutsidePointerDown, true);
}

function isEventFromAudioDock(e: Event): boolean {
  const dock = document.getElementById('audio-dock');
  if (!dock) return false;
  const path = e.composedPath();
  return path.includes(dock);
}

function onAudioLiquidOutsidePointerDown(e: PointerEvent): void {
  if (!audioDockLiquidOpen) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (isEventFromAudioDock(e)) return;
  closeAudioLiquid();
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
  playAudioDockUiSound('open');
  updateMiniPlayerOpenA11y();
  clearAudioAutoClose();
  detachAudioLiquidOutsidePointer();
  audioLiquidOutsideAttachTimer = window.setTimeout(() => {
    audioLiquidOutsideAttachTimer = null;
    window.addEventListener('pointerdown', onAudioLiquidOutsidePointerDown, true);
  }, 0);
  audioAutoCloseTimer = window.setTimeout(() => {
    closeAudioLiquid();
  }, LIQUID_AUTO_CLOSE_MS);
}

function closeAudioLiquid(): void {
  detachAudioLiquidOutsidePointer();
  if (!audioDockLiquidOpen) return;
  playAudioDockUiSound('close');
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
  initNavTextLinkMicroInteractions();
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
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (audioToggle) {
    audioToggle.setAttribute('aria-pressed', audio.isPlaying ? 'true' : 'false');
    const morphTarget = audio.isPlaying ? 1 : 0;
    const morphTau = reduceMotion ? 0.12 : 0.38;
    const morphK = 1 - Math.exp(-d / morphTau);
    audioPlaybackMorph += (morphTarget - audioPlaybackMorph) * morphK;
    if (audioPlaybackMorph < 1e-4) audioPlaybackMorph = 0;
    if (audioPlaybackMorph > 1 - 1e-4) audioPlaybackMorph = 1;

    document.documentElement.style.setProperty('--audio-wave-morph', audioPlaybackMorph.toFixed(4));

    const spd = reduceMotion ? 0.22 : 1;
    const phaseMul = (0.55 + 2.2 * audioPlaybackMorph) * spd;
    audioWavePhase += d * phaseMul;
    if (audioWavePhase > Math.PI * 200) audioWavePhase -= Math.PI * 200;
    const s8 = audio.spectrum8;
    const spectrumMul = reduceMotion ? (audio.isPlaying ? 1 : 0) : audioPlaybackMorph;
    const morphedS8 = s8.map((v) => v * spectrumMul);
    updateAudioEqBars(d, morphedS8, audioPlaybackMorph, audioWavePhase, reduceMotion, audio.isPlaying);
  }

  updateMiniPlayerCredits(audio);

  updateCustomScrollThumb();
}
