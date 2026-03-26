import type { FrameContext, ISystem } from '@/types';
import { damp } from '@/utils/math';

/**
 * Audio System.
 * Generates an ambient, cinematic drone using Web Audio API oscillators.
 * Exposes frequency data and a toggle method for 3D UI integration.
 */
export class AudioSystem implements ISystem {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private masterGain: GainNode | null = null;

  private dataArray: Uint8Array | null = null;
  private initialized = false;
  
  public isPlaying = false;

  /** Smoothed overall volume level [0, 1] derived from low frequencies. */
  public lowFrequencyVolume = 0;
  
  /** Smoothed overall volume level [0, 1] derived from high frequencies. */
  public highFrequencyVolume = 0;

  init(_ctx: FrameContext): void {
    // No HTML binding anymore; triggered by 3D HUD clicks
  }

  private async initAudio(): Promise<void> {
    if (this.initialized) return;

    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 128;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 0; // Start silent, fade in
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);

    // Create a cinematic dark drone chord
    // Base frequency (C2 ~ 65.41 Hz)
    const baseFreq = 65.41;
    const frequencies = [
      baseFreq,        // Root
      baseFreq * 1.5,  // Perfect fifth
      baseFreq * 2.0,  // Octave
      baseFreq * 2.5,  // Perfect fifth (+octave)
      baseFreq * 0.5   // Sub-octave
    ];

    frequencies.forEach((freq, index) => {
      if (!this.audioCtx || !this.masterGain) return;

      const osc = this.audioCtx.createOscillator();
      const panner = this.audioCtx.createStereoPanner();
      const filter = this.audioCtx.createBiquadFilter();
      const gain = this.audioCtx.createGain();

      osc.type = index % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq + (Math.random() - 0.5) * 1.0; 

      panner.pan.value = (Math.random() - 0.5) * 1.5;

      filter.type = 'lowpass';
      filter.frequency.value = 200 + Math.random() * 200;
      filter.Q.value = 1;

      gain.gain.value = 1.0 / (index + 1);

      osc.connect(filter);
      filter.connect(panner);
      panner.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      this.oscillators.push(osc);
    });

    this.initialized = true;
  }

  public toggleAudio = async (): Promise<void> => {
    if (!this.initialized) {
      await this.initAudio();
    }

    if (!this.audioCtx || !this.masterGain) return;

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.isPlaying = !this.isPlaying;

    const now = this.audioCtx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    
    if (this.isPlaying) {
      this.masterGain.gain.linearRampToValueAtTime(1.0, now + 2.0);
    } else {
      this.masterGain.gain.linearRampToValueAtTime(0.01, now + 1.0);
      this.masterGain.gain.setValueAtTime(0, now + 1.1);
    }
  };

  update(ctx: FrameContext): void {
    if (!this.analyser || !this.dataArray || !this.isPlaying) {
      this.lowFrequencyVolume = damp(this.lowFrequencyVolume, 0, 5, ctx.delta);
      this.highFrequencyVolume = damp(this.highFrequencyVolume, 0, 5, ctx.delta);
      return;
    }

    this.analyser.getByteFrequencyData(this.dataArray as any);

    let lowSum = 0;
    const lowCount = 10;
    for (let i = 0; i < lowCount; i++) {
      lowSum += this.dataArray[i];
    }
    const targetLow = (lowSum / lowCount) / 255.0;

    let highSum = 0;
    const highCount = 20;
    for (let i = 30; i < 30 + highCount; i++) {
      highSum += this.dataArray[i];
    }
    const targetHigh = (highSum / highCount) / 255.0;

    this.lowFrequencyVolume = damp(this.lowFrequencyVolume, targetLow, 10, ctx.delta);
    this.highFrequencyVolume = damp(this.highFrequencyVolume, targetHigh, 10, ctx.delta);
  }

  dispose(): void {
    this.oscillators.forEach(osc => osc.stop());
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }
}
