import type { FrameContext, ISystem } from '@/types';
import { damp } from '@/utils/math';

export interface MusicTrack {
  label: string;
  src: string;
  loop?: boolean;
}

const MUSIC_LIBRARY: MusicTrack[] = [
  {
    label: 'Blue Moon',
    src: `/music/${encodeURIComponent('Blue Moon.mp3')}`,
    loop: true,
  },
  {
    label: 'Sentimental Jazzy Love',
    src: '/music/sonican-lo-fi-music-loop-sentimental-jazzy-love-473154.mp3',
    loop: true,
  },
];

/**
 * Soundtrack: MP3 via MediaElementSource → analyser (nav waveform + side-curtain beats).
 */
export class AudioSystem implements ISystem {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private mediaEl: HTMLAudioElement | null = null;

  private dataArray: Uint8Array | null = null;
  private initialized = false;

  public isPlaying = false;

  private readonly tracks = [...MUSIC_LIBRARY];
  private trackIndex = 0;

  public lowFrequencyVolume = 0;
  public highFrequencyVolume = 0;

  public beatEnvelope = 0;

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
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 0;

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

  nextTrack(): void {
    if (this.tracks.length === 0) return;
    this.trackIndex = (this.trackIndex + 1) % this.tracks.length;
    const wasPlaying = this.isPlaying;
    if (this.initialized && this.mediaEl) {
      this.wireCurrentTrack();
      if (wasPlaying) void this.mediaEl.play().catch(() => {});
    }
  }

  prevTrack(): void {
    if (this.tracks.length === 0) return;
    this.trackIndex = (this.trackIndex - 1 + this.tracks.length) % this.tracks.length;
    const wasPlaying = this.isPlaying;
    if (this.initialized && this.mediaEl) {
      this.wireCurrentTrack();
      if (wasPlaying) void this.mediaEl.play().catch(() => {});
    }
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
    this.masterGain.gain.cancelScheduledValues(now);

    if (this.isPlaying) {
      try {
        await this.mediaEl.play();
      } catch {
        this.isPlaying = false;
        return;
      }
      this.masterGain.gain.linearRampToValueAtTime(1.0, now + 0.85);
    } else {
      this.mediaEl.pause();
      this.masterGain.gain.linearRampToValueAtTime(0.01, now + 0.45);
      this.masterGain.gain.setValueAtTime(0, now + 0.5);
    }
  };

  update(ctx: FrameContext): void {
    if (!this.analyser || !this.dataArray || !this.isPlaying) {
      this.lowFrequencyVolume = damp(this.lowFrequencyVolume, 0, 5, ctx.delta);
      this.highFrequencyVolume = damp(this.highFrequencyVolume, 0, 5, ctx.delta);
      this.beatEnvelope = damp(this.beatEnvelope, 0, 6, ctx.delta);
      return;
    }

    this.analyser.getByteFrequencyData(this.dataArray as any);

    let lowSum = 0;
    const lowCount = 10;
    for (let i = 0; i < lowCount; i++) {
      lowSum += this.dataArray[i]!;
    }
    const targetLow = (lowSum / lowCount) / 255.0;

    let highSum = 0;
    const highCount = 20;
    const hiStart = Math.min(32, this.dataArray.length - highCount);
    for (let i = hiStart; i < hiStart + highCount && i < this.dataArray.length; i++) {
      highSum += this.dataArray[i]!;
    }
    const targetHigh = (highSum / highCount) / 255.0;

    this.lowFrequencyVolume = damp(this.lowFrequencyVolume, targetLow, 10, ctx.delta);
    this.highFrequencyVolume = damp(this.highFrequencyVolume, targetHigh, 10, ctx.delta);

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
  }

  dispose(): void {
    this.mediaEl?.pause();
    try {
      this.mediaSource?.disconnect();
      this.analyser?.disconnect();
      this.masterGain?.disconnect();
    } catch {
      /* ignore */
    }
    this.mediaEl = null;
    this.mediaSource = null;
    if (this.audioCtx) {
      void this.audioCtx.close();
    }
    this.audioCtx = null;
    this.analyser = null;
    this.masterGain = null;
    this.initialized = false;
  }
}
