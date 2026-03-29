import type { AudioSystem } from '@/systems/audioSystem';
import type { ScrollSystem } from '@/systems/scrollSystem';

const FLOW_W = 220;
const FLOW_MID = 12;

function buildFlowPath(elapsed: number, low: number, high: number, playing: boolean): string {
  if (!playing) {
    return `M 0 ${FLOW_MID} L ${FLOW_W} ${FLOW_MID}`;
  }
  const amp = 3.5 + low * 16 + high * 9;
  let d = `M 0 ${FLOW_MID}`;
  for (let x = 4; x <= FLOW_W; x += 4) {
    const t = elapsed * 2.1 + x * 0.095;
    const y =
      FLOW_MID +
      Math.sin(t) * amp * 0.55 +
      Math.sin(t * 1.73 + x * 0.035) * amp * 0.4 +
      Math.sin(t * 0.41 + x * 0.12) * amp * 0.15;
    d += ` L ${x.toFixed(1)} ${y.toFixed(2)}`;
  }
  return d;
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

  const audioToggle = document.getElementById('nav-audio-toggle');
  if (audioToggle) {
    audioToggle.setAttribute('aria-pressed', audio.isPlaying ? 'true' : 'false');
  }

  const path = document.getElementById('nav-flow-path');
  if (path) {
    path.setAttribute(
      'd',
      buildFlowPath(elapsed, audio.lowFrequencyVolume, audio.highFrequencyVolume, audio.isPlaying),
    );
  }

  const meta = document.getElementById('nav-mini-meta');
  if (meta) {
    meta.textContent = audio.getCurrentTrackLabel();
  }

  updateCustomScrollThumb();
}
