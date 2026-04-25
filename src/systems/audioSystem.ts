import type { FrameContext, ISystem } from '@/types';
import { damp } from '@/utils/math';

export interface MusicTrack {
  label: string;
  /** Composer / performer / rights line for the UI */
  artist: string;
  src: string;
  loop?: boolean;
}

/**
 * Files in `public/music/copyright/` → `/music/copyright/…`.
 * Encode segments; avoid `,` in filenames — Vite’s static dev server falls through to `index.html` for `%2C` paths.
 */
function copyrightTrack(file: string): string {
  return `/music/copyright/${encodeURIComponent(file)}`;
}

/** Master peak — music is intentionally quiet so UX / spatial read stays in front. */
const MASTER_OUTPUT_PEAK = 0.1;

/** ~Audible “zero” for exponential ramps (must stay > 0 until the final instant). */
const GAIN_EPS = 0.0001;

const MUSIC_FADE_IN_SEC = 1.15;
const MUSIC_FADE_OUT_SEC = 1.05;
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
    label: 'Subway Run',
    artist: 'Lō-fÿkkø, soave lofi',
    src: copyrightTrack('Lō-fÿkkø soave lofi - Subway Run.mp3'),
  },
  {
    label: 'In The Air Tonight',
    artist: 'Flott.',
    src: copyrightTrack('Flott. - In The Air Tonight.mp3'),
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

  private readonly onTrackEnded = (): void => {
    if (!this.isPlaying || this.tracks.length === 0) return;
    if (this.trackSwapTimer != null) return;
    this.crossfadeToIndex((i) => (i + 1) % this.tracks.length);
  };

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
    try {
      el.pause();
    } catch {
      /* ignore */
    }
    el.loop = t.loop === true;
    el.src = t.src;
    el.load();
  }

  /** After `src` / `load()`, browsers often need `canplay` before `play()` succeeds (fixes track 2+). */
  private async playWhenReady(): Promise<boolean> {
    const el = this.mediaEl;
    if (!el || !this.isPlaying) return false;

    await new Promise<void>((resolve) => {
      if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        resolve();
        return;
      }
      const done = (): void => {
        el.removeEventListener('canplay', onReady);
        el.removeEventListener('error', onErr);
        resolve();
      };
      const onReady = (): void => done();
      const onErr = (): void => done();
      el.addEventListener('canplay', onReady, { once: true });
      el.addEventListener('error', onErr, { once: true });
    });

    if (!this.isPlaying) return false;
    try {
      await el.play();
      return true;
    } catch {
      return false;
    }
  }

  /** Shared `AudioContext` + UI bus — safe to call before full music init (clicks/hovers work with music off). */
  private ensureContextAndUiBus(): void {
    if (typeof window === 'undefined') return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!this.audioCtx) {
      this.audioCtx = new AC();
    }
    if (!this.uiSfxGain) {
      this.uiSfxGain = this.audioCtx.createGain();
      this.uiSfxGain.gain.value = UI_SFX_BUS;
      this.uiSfxGain.connect(this.audioCtx.destination);
    }
  }

  private async initAudio(): Promise<void> {
    if (this.initialized) return;

    this.ensureContextAndUiBus();
    if (!this.audioCtx) return;

    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.35;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 0;

    this.mediaEl = new Audio();
    this.mediaEl.preload = 'auto';
    this.mediaEl.addEventListener('ended', this.onTrackEnded);

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
      if (this.isPlaying) void this.playWhenReady();
      return;
    }

    if (!this.isPlaying) {
      this.trackIndex = nextIndex(this.trackIndex);
      this.wireCurrentTrack();
      if (this.isPlaying) void this.playWhenReady();
      return;
    }

    this.clearMusicAsyncTimers();
    this.bumpOpGen();
    const myGen = this.opGen;

    const ctx = this.audioCtx;
    const g = this.masterGain.gain;
    const now = ctx.currentTime;
    g.cancelScheduledValues(now);
    const out0 = Math.max(GAIN_EPS, g.value);
    g.setValueAtTime(out0, now);
    g.exponentialRampToValueAtTime(GAIN_EPS, now + TRACK.OUT);

    this.trackSwapTimer = setTimeout(() => {
      this.trackSwapTimer = null;
      if (myGen !== this.opGen) return;
      this.trackIndex = nextIndex(this.trackIndex);
      this.wireCurrentTrack();
      void this.playWhenReady().then((ok) => {
        if (myGen !== this.opGen || !ok) return;
        if (!this.audioCtx || !this.masterGain) return;
        const t0 = this.audioCtx.currentTime;
        const gi = this.masterGain.gain;
        gi.cancelScheduledValues(t0);
        gi.setValueAtTime(GAIN_EPS, t0);
        gi.exponentialRampToValueAtTime(MASTER_OUTPUT_PEAK, t0 + TRACK.IN);
      });
    }, TRACK.OUT * 1000 + 40);
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
      g.setValueAtTime(GAIN_EPS, now);
      const started = await this.playWhenReady();
      if (!started) {
        this.isPlaying = false;
        return;
      }
      const t1 = this.audioCtx.currentTime;
      g.cancelScheduledValues(t1);
      g.setValueAtTime(GAIN_EPS, t1);
      g.exponentialRampToValueAtTime(MASTER_OUTPUT_PEAK, t1 + MUSIC.FADE_IN);
    } else {
      this.clearMusicAsyncTimers();
      this.bumpOpGen();
      const stopId = this.opGen;
      g.cancelScheduledValues(now);
      const out0 = Math.max(GAIN_EPS, g.value);
      g.setValueAtTime(out0, now);
      g.exponentialRampToValueAtTime(GAIN_EPS, now + MUSIC.FADE_OUT);
      this.stopPauseTimer = setTimeout(() => {
        this.stopPauseTimer = null;
        if (this.isPlaying) return;
        if (this.opGen !== stopId) return;
        this.mediaEl?.pause();
      }, MUSIC.FADE_OUT * 1000 + 80);
    }
  };

  /**
   * Soft UI hover — works even when the score is paused (lazy `AudioContext`).
   */
  playInterfaceHover(): void {
    this.playOneShotSfx('hover');
  }

  /**
   * Primary click — works even when the score is paused.
   */
  playInterfaceClick(): void {
    this.playOneShotSfx('click');
  }

  /** Short band-limited noise burst for tactile “snap” (distinct from pure tones). */
  private playUiNoiseClick(ctx: AudioContext, t0: number, into: AudioNode): void {
    const sr = ctx.sampleRate;
    const durS = 0.026;
    const n = Math.max(1, Math.floor(durS * sr));
    const buf = ctx.createBuffer(1, n, sr);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const env = Math.pow(1 - i / Math.max(1, n - 1), 3.2);
      ch[i] = (Math.random() * 2 - 1) * env * 0.95;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2680, t0);
    bp.Q.setValueAtTime(0.85, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.11, t0 + 0.00045);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.019);
    src.connect(bp);
    bp.connect(g);
    g.connect(into);
    src.start(t0);
    src.stop(t0 + durS + 0.002);
  }

  private playOneShotSfx(kind: 'hover' | 'click'): void {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    this.ensureContextAndUiBus();
    if (!this.audioCtx || !this.uiSfxGain) return;
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }

    if (kind === 'hover') {
      const tWall = typeof performance !== 'undefined' ? performance.now() : 0;
      if (tWall - this.lastUiHoverAt < 72) return;
      this.lastUiHoverAt = tWall;
    }

    const ctx = this.audioCtx;
    const t0 = ctx.currentTime;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = kind === 'hover' ? 380 : 120;
    hp.Q.value = 0.5;
    const bus = ctx.createGain();
    bus.gain.value = kind === 'hover' ? 0.92 : 0.96;
    bus.connect(hp);
    hp.connect(this.uiSfxGain);

    const startStop = (o: OscillatorNode, g: GainNode, until: number): void => {
      o.connect(g);
      g.connect(bus);
      o.start(t0);
      o.stop(until);
    };

    if (kind === 'hover') {
      /* Glassy up-chirp + faint fifth — reads as “hover”, not a click. */
      const a = ctx.createOscillator();
      a.type = 'sine';
      a.frequency.setValueAtTime(1420, t0);
      a.frequency.linearRampToValueAtTime(2680, t0 + 0.034);
      const gA = ctx.createGain();
      gA.gain.setValueAtTime(0.0001, t0);
      gA.gain.linearRampToValueAtTime(0.048, t0 + 0.0022);
      gA.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.055);
      startStop(a, gA, t0 + 0.062);

      const b = ctx.createOscillator();
      b.type = 'sine';
      b.frequency.setValueAtTime(2130, t0);
      b.frequency.linearRampToValueAtTime(4020, t0 + 0.028);
      const gB = ctx.createGain();
      gB.gain.setValueAtTime(0.0001, t0);
      gB.gain.linearRampToValueAtTime(0.018, t0 + 0.0018);
      gB.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.042);
      startStop(b, gB, t0 + 0.048);
    } else {
      this.playUiNoiseClick(ctx, t0, bus);

      const wood = ctx.createOscillator();
      wood.type = 'sine';
      wood.frequency.setValueAtTime(188, t0);
      wood.frequency.exponentialRampToValueAtTime(72, t0 + 0.024);
      const gW = ctx.createGain();
      gW.gain.setValueAtTime(0.0001, t0);
      gW.gain.linearRampToValueAtTime(0.11, t0 + 0.0014);
      gW.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.048);
      startStop(wood, gW, t0 + 0.058);

      const tack = ctx.createOscillator();
      tack.type = 'triangle';
      tack.frequency.setValueAtTime(620, t0);
      tack.frequency.exponentialRampToValueAtTime(240, t0 + 0.012);
      const gT = ctx.createGain();
      gT.gain.setValueAtTime(0.0001, t0);
      gT.gain.linearRampToValueAtTime(0.045, t0 + 0.00055);
      gT.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.022);
      startStop(tack, gT, t0 + 0.028);
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
    this.mediaEl?.removeEventListener('ended', this.onTrackEnded);
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
