import type { FrameContext, ISystem } from '@/types';
import { damp } from '@/utils/math';

export interface MusicTrack {
  label: string;
  /** Composer / performer / rights line for the UI */
  artist: string;
  src: string;
  loop?: boolean;
}

/** Files in `public/music/copyright/` → `/music/copyright/…` (encode filenames with spaces/parens). */
function copyrightTrack(file: string): string {
  return `/music/copyright/${encodeURIComponent(file)}`;
}

/** Master peak — music is intentionally quiet so UX / spatial read stays in front. */
const MASTER_OUTPUT_PEAK = 0.1;

const MUSIC_FADE_IN_SEC = 0.95;
const MUSIC_FADE_OUT_SEC = 0.8;
const TRACK_XFADE_OUT_SEC = 0.22;
const TRACK_XFADE_IN_SEC = 0.4;

const MUSIC = {
  FADE_IN: MUSIC_FADE_IN_SEC,
  FADE_OUT: MUSIC_FADE_OUT_SEC,
} as const;

const TRACK = {
  OUT: TRACK_XFADE_OUT_SEC,
  IN: TRACK_XFADE_IN_SEC,
} as const;

/** UI SFX bus — well above the quiet music bus so hovers / clicks read clearly. */
const UI_SFX_BUS = 0.38;

const MUSIC_LIBRARY: MusicTrack[] = [
  {
    label: 'Everything In Its Right Place',
    artist: 'Alexandra Fever',
    src: copyrightTrack('Alexandra Fever - Everything In Its Right Place (SPOTISAVER).mp3'),
    loop: true,
  },
  {
    label: 'Ascension',
    artist: 'Jason Fervento',
    src: copyrightTrack('Jason Fervento - Ascension (SPOTISAVER).mp3'),
    loop: true,
  },
];

/**
 * Soundtrack: MP3 via MediaElementSource → analyser (nav EQ / session state; not used by WebGL).
 */
export class AudioSystem implements ISystem {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private uiSfxGain: GainNode | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private mediaEl: HTMLAudioElement | null = null;

  private dataArray: Uint8Array | null = null;
  private initialized = false;

  public isPlaying = false;

  private readonly tracks = [...MUSIC_LIBRARY];
  private trackIndex = 0;

  /** Bumped to invalidate async pause / crossfade callbacks. */
  private opGen = 0;
  private stopPauseTimer: ReturnType<typeof setTimeout> | null = null;
  private trackSwapTimer: ReturnType<typeof setTimeout> | null = null;

  private lastUiHoverAt = 0;

  public lowFrequencyVolume = 0;
  public highFrequencyVolume = 0;

  public beatEnvelope = 0;

  /** Smoothed 0..1 levels for 8 log-ish spectrum bands (nav mini EQ). */
  public readonly spectrum8: number[] = [0, 0, 0, 0, 0, 0, 0, 0];

  private beatPulsePending = false;
  private bassInstant = 0;
  private bassBaseline = 0;
  private beatRefractoryUntil = 0;

  consumeBeatPulse(): boolean {
    if (!this.beatPulsePending) return false;
    this.beatPulsePending = false;
    return true;
  }

  init(_ctx: FrameContext): void {}

  private clearMusicAsyncTimers(): void {
    if (this.stopPauseTimer != null) {
      clearTimeout(this.stopPauseTimer);
      this.stopPauseTimer = null;
    }
    if (this.trackSwapTimer != null) {
      clearTimeout(this.trackSwapTimer);
      this.trackSwapTimer = null;
    }
  }

  private bumpOpGen(): void {
    this.opGen++;
  }

  private wireCurrentTrack(): void {
    const el = this.mediaEl;
    if (!el) return;
    const t = this.tracks[this.trackIndex];
    if (!t) return;
    el.loop = t.loop !== false;
    el.src = t.src;
    el.load();
  }

  private async initAudio(): Promise<void> {
    if (this.initialized) return;

    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AC();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.35;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 0;

    this.uiSfxGain = this.audioCtx.createGain();
    this.uiSfxGain.gain.value = UI_SFX_BUS;
    this.uiSfxGain.connect(this.audioCtx.destination);

    this.mediaEl = new Audio();
    this.mediaEl.preload = 'auto';

    this.mediaSource = this.audioCtx.createMediaElementSource(this.mediaEl);
    this.mediaSource.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.audioCtx.destination);

    this.wireCurrentTrack();
    this.initialized = true;
  }

  getCurrentTrackLabel(): string {
    return this.tracks[this.trackIndex]?.label ?? '—';
  }

  getCurrentTrackArtist(): string {
    return this.tracks[this.trackIndex]?.artist ?? '';
  }

  private crossfadeToIndex(nextIndex: (n: number) => number): void {
    if (this.tracks.length === 0) return;
    if (!this.initialized || !this.audioCtx || !this.masterGain || !this.mediaEl) {
      this.trackIndex = nextIndex(this.trackIndex);
      this.wireCurrentTrack();
      if (this.isPlaying && this.mediaEl) void this.mediaEl.play().catch(() => {});
      return;
    }

    if (!this.isPlaying) {
      this.trackIndex = nextIndex(this.trackIndex);
      this.wireCurrentTrack();
      if (this.isPlaying) void this.mediaEl.play().catch(() => {});
      return;
    }

    this.clearMusicAsyncTimers();
    this.bumpOpGen();
    const myGen = this.opGen;

    const ctx = this.audioCtx;
    const g = this.masterGain.gain;
    const now = ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0, g.value), now);
    g.linearRampToValueAtTime(0, now + TRACK.OUT);

    this.trackSwapTimer = setTimeout(() => {
      this.trackSwapTimer = null;
      if (myGen !== this.opGen) return;
      this.trackIndex = nextIndex(this.trackIndex);
      this.wireCurrentTrack();
      void this.mediaEl?.play().catch(() => {});
      if (!this.audioCtx || !this.masterGain) return;
      const t0 = this.audioCtx.currentTime;
      this.masterGain.gain.setValueAtTime(0, t0);
      this.masterGain.gain.linearRampToValueAtTime(MASTER_OUTPUT_PEAK, t0 + TRACK.IN);
    }, TRACK.OUT * 1000 + 20);
  }

  nextTrack(): void {
    this.crossfadeToIndex((i) => (i + 1) % this.tracks.length);
  }

  prevTrack(): void {
    this.crossfadeToIndex((i) => (i - 1 + this.tracks.length) % this.tracks.length);
  }

  public toggleAudio = async (): Promise<void> => {
    if (!this.initialized) {
      await this.initAudio();
    }

    if (!this.audioCtx || !this.masterGain || !this.mediaEl) return;

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.isPlaying = !this.isPlaying;

    const now = this.audioCtx.currentTime;
    const g = this.masterGain.gain;

    if (this.isPlaying) {
      this.clearMusicAsyncTimers();
      this.bumpOpGen();
      g.cancelScheduledValues(now);
      g.setValueAtTime(0, now);
      try {
        await this.mediaEl.play();
      } catch {
        this.isPlaying = false;
        return;
      }
      g.linearRampToValueAtTime(MASTER_OUTPUT_PEAK, now + MUSIC.FADE_IN);
    } else {
      this.clearMusicAsyncTimers();
      this.bumpOpGen();
      const stopId = this.opGen;
      g.cancelScheduledValues(now);
      g.setValueAtTime(Math.max(0, g.value), now);
      g.linearRampToValueAtTime(0, now + MUSIC.FADE_OUT);
      this.stopPauseTimer = setTimeout(() => {
        this.stopPauseTimer = null;
        if (this.isPlaying) return;
        if (this.opGen !== stopId) return;
        this.mediaEl?.pause();
      }, MUSIC.FADE_OUT * 1000 + 30);
    }
  };

  /**
   * Soft, glassy lift — only when the score is on (`isPlaying`); throttled in-engine.
   */
  playInterfaceHover(): void {
    this.playOneShotSfx('hover');
  }

  /**
   * Low, short tactile tick — for primary controls; only when the score is on.
   */
  playInterfaceClick(): void {
    this.playOneShotSfx('click');
  }

  private playOneShotSfx(kind: 'hover' | 'click'): void {
    if (!this.isPlaying || !this.initialized || !this.audioCtx || !this.uiSfxGain) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    if (kind === 'hover') {
      const tWall = typeof performance !== 'undefined' ? performance.now() : 0;
      if (tWall - this.lastUiHoverAt < 100) return;
      this.lastUiHoverAt = tWall;
      const t0 = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      osc.type = 'sine';
      const peak = 0.16;
      const startHz = 1680;
      const endHz = 1240;
      osc.frequency.setValueAtTime(startHz, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(80, endHz), t0 + 0.1);
      const g = this.audioCtx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
      osc.connect(g);
      g.connect(this.uiSfxGain);
      osc.start(t0);
      osc.stop(t0 + 0.11);
    } else {
      const t0 = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, t0);
      const g = this.audioCtx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.24, t0 + 0.0018);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
      osc.connect(g);
      g.connect(this.uiSfxGain);
      osc.start(t0);
      osc.stop(t0 + 0.055);
    }
  }

  update(ctx: FrameContext): void {
    if (!this.analyser || !this.dataArray) {
      return;
    }

    if (!this.isPlaying) {
      this.lowFrequencyVolume = damp(this.lowFrequencyVolume, 0, 5, ctx.delta);
      this.highFrequencyVolume = damp(this.highFrequencyVolume, 0, 5, ctx.delta);
      this.beatEnvelope = damp(this.beatEnvelope, 0, 6, ctx.delta);
      for (let i = 0; i < 8; i++) {
        this.spectrum8[i] = damp(this.spectrum8[i]!, 0, 6, ctx.delta);
      }
      return;
    }

    this.analyser.getByteFrequencyData(this.dataArray as any);
    const d = this.dataArray;
    const n = d.length;
    const maxI = Math.max(1, Math.floor(n * 0.94));

    let lowSum = 0;
    const lowCount = 10;
    for (let i = 0; i < lowCount; i++) {
      lowSum += d[i]!;
    }
    const targetLow = (lowSum / lowCount) / 255.0;

    let highSum = 0;
    const highCount = 20;
    const hiStart = Math.min(32, d.length - highCount);
    for (let i = hiStart; i < hiStart + highCount && i < d.length; i++) {
      highSum += d[i]!;
    }
    const targetHigh = (highSum / highCount) / 255.0;

    this.lowFrequencyVolume = damp(this.lowFrequencyVolume, targetLow, 10, ctx.delta);
    this.highFrequencyVolume = damp(this.highFrequencyVolume, targetHigh, 10, ctx.delta);

    const bands = 8;
    for (let b = 0; b < bands; b++) {
      const t0 = b / bands;
      const t1 = (b + 1) / bands;
      const i0 = Math.floor(Math.pow(t0, 0.7) * maxI);
      const i1 = Math.max(i0 + 1, Math.floor(Math.pow(t1, 0.7) * maxI));
      let s = 0;
      for (let i = i0; i < i1; i++) s += d[i]!;
      const w = i1 - i0;
      const mag = w > 0 ? s / w / 255.0 : 0;
      // Less compression, slightly louder mapping so the nav meter visibly dances.
      const lifted = Math.min(1, Math.pow(mag, 0.38) * 1.45 + (b <= 1 ? 0.05 : 0));
      this.spectrum8[b] = damp(this.spectrum8[b]!, lifted, 10.5, ctx.delta);
    }

    this.beatEnvelope *= Math.exp(-ctx.delta * 2.4);
    this.beatEnvelope = Math.min(1, this.beatEnvelope);

    let bassSum = 0;
    const bassBins = 8;
    for (let i = 0; i < bassBins && i < this.dataArray.length; i++) {
      bassSum += this.dataArray[i]!;
    }
    this.bassInstant = (bassSum / bassBins) / 255.0;
    this.bassBaseline = damp(this.bassBaseline, this.bassInstant, 2.2, ctx.delta);
    const flux = this.bassInstant - this.bassBaseline;
    const threshold = 0.055 + this.lowFrequencyVolume * 0.06;
    if (flux > threshold && ctx.elapsed >= this.beatRefractoryUntil) {
      this.beatPulsePending = true;
      this.beatEnvelope = 1;
      this.beatRefractoryUntil = ctx.elapsed + 0.16;
    }

    const be = this.beatEnvelope;
    this.spectrum8[0] = Math.min(1, this.spectrum8[0]! + be * 0.16);
    this.spectrum8[1] = Math.min(1, this.spectrum8[1]! + be * 0.1);
    this.spectrum8[5] = Math.min(1, this.spectrum8[5]! + be * 0.06);
    this.spectrum8[6] = Math.min(1, this.spectrum8[6]! + be * 0.1);
    this.spectrum8[7] = Math.min(1, this.spectrum8[7]! + be * 0.12);
  }

  dispose(): void {
    this.clearMusicAsyncTimers();
    this.mediaEl?.pause();
    try {
      this.mediaSource?.disconnect();
      this.analyser?.disconnect();
      this.masterGain?.disconnect();
      this.uiSfxGain?.disconnect();
    } catch {
      /* ignore */
    }
    this.mediaEl = null;
    this.mediaSource = null;
    this.uiSfxGain = null;
    if (this.audioCtx) {
      void this.audioCtx.close();
    }
    this.audioCtx = null;
    this.analyser = null;
    this.masterGain = null;
    this.initialized = false;
  }
}
