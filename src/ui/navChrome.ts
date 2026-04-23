import { contactFormDryRun } from '@/config/contactForm.config';
import type { AudioSystem } from '@/systems/audioSystem';
import type { ScrollSystem } from '@/systems/scrollSystem';
import { initDrawerSlotTitles } from '@/ui/drawerSlotTitles';
import { navScrollToJourneyIndex, navScrollToWork } from '@/ui/portfolioNavigator';
import {
  contactFieldId,
  type ContactFormField,
  validateContactFields,
} from '@/utils/contactFormValidation';

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
/** Phase for a very slow, tiny wobble (no raw-audio noise on the ring). */
let adVizSwirl = 0;
/** One smoothed level from the analyser (broad strokes only). */
let adLevel = 0;
/** Double EMA 0..1: butter-smooth motion on the single pulse readout. */
let adViz1 = 0.42;
let adViz2 = 0.42;

let drawerFocusReturn: HTMLElement | null = null;

/** Set by `initSiteDrawer` so the contact sheet can close the menu. */
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
    if (!document.body.classList.contains('contact-sheet-open')) {
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

  linkIndex?.addEventListener('click', (e) => onLinkNav(e, () => navScrollToJourneyIndex()));
  linkWork?.addEventListener('click', (e) => onLinkNav(e, () => navScrollToWork()));

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

let contactFocusReturn: HTMLElement | null = null;
let contactSuccessCloseTimer: number | null = null;

/**
 * Free-form email: Web3Forms (https://web3forms.com). Set VITE_WEB3FORMS_ACCESS_KEY or
 * data-access-key on #contact-form in index.html.
 */
function initContactSheet(): void {
  const root = document.getElementById('contact-sheet');
  const backdrop = document.getElementById('contact-sheet-backdrop');
  const panel = document.getElementById('contact-sheet-panel') as HTMLDivElement | null;
  const form = document.getElementById('contact-form') as HTMLFormElement | null;
  const errEl = document.getElementById('contact-form-error');
  const successEl = document.getElementById('contact-success');
  const closeBtn = document.getElementById('contact-sheet-close');
  const navContact = document.getElementById('nav-link-contact');
  const drawerContact = document.getElementById('drawer-link-contact');
  if (!root || !panel || !form) return;

  const isOpen = () => root.classList.contains('contact-sheet--open');

  const getFocusable = (): HTMLElement[] => {
    const raw = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    return raw.filter((el) => {
      if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return false;
      if (el.classList.contains('contact-sheet__hp')) return false;
      return true;
    });
  };

  const clearSuccessTimer = (): void => {
    if (contactSuccessCloseTimer != null) {
      window.clearTimeout(contactSuccessCloseTimer);
      contactSuccessCloseTimer = null;
    }
  };

  const clearFieldInvalid = (): void => {
    for (const id of Object.values(contactFieldId)) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.classList.remove('contact-sheet__input--invalid', 'contact-sheet__textarea--invalid');
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    }
  };

  const setFieldInvalid = (field: ContactFormField): void => {
    const id = contactFieldId[field];
    const el = document.getElementById(id);
    if (!el) return;
    const isTa = el.tagName === 'TEXTAREA';
    el.classList.add(isTa ? 'contact-sheet__textarea--invalid' : 'contact-sheet__input--invalid');
    el.setAttribute('aria-invalid', 'true');
    if (errEl) {
      el.setAttribute('aria-describedby', 'contact-form-error');
    }
  };

  const resetToForm = (): void => {
    clearFieldInvalid();
    root.classList.remove('contact-sheet--success', 'contact-sheet--sending', 'contact-sheet--error');
    form.reset();
    form.removeAttribute('aria-hidden');
    form.setAttribute('aria-busy', 'false');
    successEl?.setAttribute('aria-hidden', 'true');
    if (errEl) {
      errEl.textContent = '';
      errEl.setAttribute('hidden', '');
    }
  };

  const showError = (message: string): void => {
    if (!errEl) return;
    errEl.textContent = message;
    errEl.removeAttribute('hidden');
    root.classList.add('contact-sheet--error');
  };

  const resolveWeb3AccessKey = (): string | null => {
    const fromEnv = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY?.trim();
    if (fromEnv) {
      return fromEnv;
    }
    const raw = form.dataset.accessKey?.trim() ?? '';
    if (raw && !raw.includes('REPLACE')) {
      return raw;
    }
    return null;
  };

  const openContact = (): void => {
    if (isOpen()) return;
    clearSuccessTimer();
    closeSiteMenu?.();
    contactFocusReturn = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    resetToForm();
    root.classList.add('contact-sheet--open');
    root.setAttribute('aria-hidden', 'false');
    navContact?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('contact-sheet-open');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const first = getFocusable()[0];
      (first ?? panel).focus();
    });
  };

  const closeContact = (): void => {
    if (!isOpen()) return;
    clearSuccessTimer();
    root.classList.remove('contact-sheet--open');
    root.setAttribute('aria-hidden', 'true');
    navContact?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('contact-sheet-open');
    if (!document.body.classList.contains('site-drawer-open')) {
      document.body.style.removeProperty('overflow');
    }
    resetToForm();
    if (contactFocusReturn) {
      contactFocusReturn.focus();
      contactFocusReturn = null;
    } else {
      navContact?.focus();
    }
  };

  navContact?.addEventListener('click', (e) => {
    e.preventDefault();
    openContact();
  });

  drawerContact?.addEventListener('click', (e) => {
    e.preventDefault();
    closeSiteMenu?.();
    openContact();
  });

  closeBtn?.addEventListener('click', () => {
    closeContact();
  });
  backdrop?.addEventListener('click', () => {
    closeContact();
  });

  form.addEventListener('input', (e) => {
    const t = e.target as HTMLElement | null;
    if (!t?.id?.startsWith('contact-')) {
      return;
    }
    t.classList.remove('contact-sheet__input--invalid', 'contact-sheet__textarea--invalid');
    t.removeAttribute('aria-invalid');
    t.removeAttribute('aria-describedby');
  });

  const showContactSuccess = (): void => {
    root.classList.remove('contact-sheet--error');
    clearFieldInvalid();
    root.classList.add('contact-sheet--success');
    form.setAttribute('aria-hidden', 'true');
    successEl?.setAttribute('aria-hidden', 'false');
    successEl?.focus({ preventScroll: true });
    clearSuccessTimer();
    contactSuccessCloseTimer = window.setTimeout(() => {
      closeContact();
    }, 2600);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldInvalid();
    if (errEl) {
      errEl.textContent = '';
      errEl.setAttribute('hidden', '');
    }
    root.classList.remove('contact-sheet--error');

    const fd = new FormData(form);
    const name = String(fd.get('name') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim();
    const message = String(fd.get('message') ?? '').trim();
    const botcheck = String(fd.get('botcheck') ?? '');

    const v = validateContactFields(name, email, message);
    if (v) {
      showError(v.message);
      setFieldInvalid(v.field);
      const focusId = contactFieldId[v.field];
      document.getElementById(focusId)?.focus({ preventScroll: true });
      return;
    }

    if (botcheck.length > 0) {
      return;
    }

    if (!contactFormDryRun) {
      const accessKey = resolveWeb3AccessKey();
      if (!accessKey) {
        showError(
          'Form not configured. Add your Web3Forms access key: .env (VITE_WEB3FORMS_ACCESS_KEY) or data-access-key in index.html.',
        );
        return;
      }
    }

    root.classList.add('contact-sheet--sending');
    form.setAttribute('aria-busy', 'true');
    const submitBtn = document.getElementById('contact-form-submit') as HTMLButtonElement | null;
    if (submitBtn) {
      submitBtn.disabled = true;
    }

    try {
      if (contactFormDryRun) {
        await new Promise((r) => {
          window.setTimeout(r, 220);
        });
        showContactSuccess();
        return;
      }

      const accessKey = resolveWeb3AccessKey()!;
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: accessKey,
          name,
          email,
          message,
          subject: 'Inkblot Studio — contact form',
          ...(botcheck ? { botcheck } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; error?: string };
      if (res.ok && data.success === true) {
        showContactSuccess();
      } else {
        const msg =
          (typeof data.message === 'string' && data.message) ||
          (typeof data.error === 'string' && data.error) ||
          (res.status === 400 ? 'Please check the fields and try again.' : 'Could not send. Try again or email us.');
        showError(msg);
      }
    } catch {
      showError('Network error. Check your connection or email us directly.');
    } finally {
      root.classList.remove('contact-sheet--sending');
      form.setAttribute('aria-busy', 'false');
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isOpen()) return;
    e.preventDefault();
    closeContact();
  });

  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !isOpen()) return;
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
  document.getElementById('nav-link-index')?.addEventListener('click', (e) => {
    e.preventDefault();
    navScrollToJourneyIndex();
  });
  document.getElementById('nav-link-work')?.addEventListener('click', (e) => {
    e.preventDefault();
    navScrollToWork();
  });
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
  initContactSheet();
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
    // Single wideband level, heavily damped (frame-to-frame noise rejected)
    const rawLevel = Math.min(1, 0.52 * lf + 0.28 * hf + 0.2 * b);
    const aLevel = 1 - Math.exp(-2.4 * d);
    adLevel += (rawLevel - adLevel) * aLevel;
    if (!playing) {
      adLevel += (0 - adLevel) * (1 - Math.exp(-1.4 * d));
    }
    adVizSwirl = (adVizSwirl + d * 0.55) % 62.83;
    const a1 = 1 - Math.exp(-3.2 * d);
    const a2 = 1 - Math.exp(-2.0 * d);
    let target: number;
    if (playing) {
      // Mostly the already-smooth petal term; adLevel gives long-weighted “loud” motion
      target = 0.08 + 0.9 * (0.52 * p + 0.48 * adLevel);
    } else {
      target = 0.2 + 0.14 * Math.sin(adVizSwirl * 0.35);
    }
    target = Math.min(0.98, Math.max(0.06, target));
    if (playing) {
      const micro = 1 + 0.04 * Math.sin(adVizSwirl * 0.14);
      target = Math.min(0.99, Math.max(0.07, target * micro));
    }
    adViz1 += (target - adViz1) * a1;
    adViz2 += (adViz1 - adViz2) * a2;
    const pulse = Math.min(0.99, Math.max(0.07, adViz2));
    const rot = playing ? Math.sin(adVizSwirl * 0.1) * 5.5 : Math.sin(adVizSwirl * 0.25) * 4;
    audioToggle.style.setProperty('--ad-pulse', pulse.toFixed(3));
    audioToggle.style.setProperty('--ad-rot', rot.toFixed(2));
  }

  updateMiniPlayerCredits(audio);

  updateCustomScrollThumb();
}
