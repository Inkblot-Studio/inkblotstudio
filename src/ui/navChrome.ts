import type { AudioSystem } from '@/systems/audioSystem';
import type { ScrollSystem } from '@/systems/scrollSystem';

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
const DECK_CX = 28;
const DECK_CY = 28;

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Floral “platter” rotation — faster + bass-weighted when playing; flutter from treble. */
function deckRotationDeg(
  elapsed: number,
  low: number,
  high: number,
  playing: boolean,
  reducedMotion: boolean,
): number {
  if (!playing) {
    return 0;
  }
  if (reducedMotion) {
    return elapsed * 18;
  }
  const speed = 56 * (1 + low * 0.55 + high * 0.14);
  const flutter = Math.sin(elapsed * 15.2) * high * 3.2;
  return elapsed * speed + flutter;
}

export function initNavChrome(audio: AudioSystem): void {
  document.getElementById('nav-audio-toggle')?.addEventListener('click', (e) => {
    e.preventDefault();
    void audio.toggleAudio();
  });
  document.getElementById('nav-mini-prev')?.addEventListener('click', (e) => {
    e.preventDefault();
    audio.prevTrack();
  });
  document.getElementById('nav-mini-next')?.addEventListener('click', (e) => {
    e.preventDefault();
    audio.nextTrack();
  });

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
  elapsed: number,
): void {
  const root = document.documentElement;
  const warp = Math.min(scroll.velocityPxPerSec / 3800, 1);
  root.style.setProperty('--nav-warp', warp.toFixed(4));
  root.style.setProperty('--nav-dir', String(scroll.scrollDirection));
  document.body.classList.toggle('audio-active', audio.isPlaying);
  document.body.classList.toggle('music-playing', audio.isPlaying);

  const playerWrap = document.getElementById('nav-player-wrap');
  if (playerWrap) {
    playerWrap.setAttribute('aria-hidden', audio.isPlaying ? 'false' : 'true');
  }

  const audioToggle = document.getElementById('nav-audio-toggle');
  if (audioToggle) {
    audioToggle.setAttribute('aria-pressed', audio.isPlaying ? 'true' : 'false');
  }

  const deckRot = document.getElementById('nav-deck-rot');
  if (deckRot) {
    const deg = deckRotationDeg(
      elapsed,
      audio.lowFrequencyVolume,
      audio.highFrequencyVolume,
      audio.isPlaying,
      prefersReducedMotion(),
    );
    deckRot.setAttribute('transform', `rotate(${deg} ${DECK_CX} ${DECK_CY})`);
  }

  updateMiniPlayerCredits(audio);

  updateCustomScrollThumb();
}
