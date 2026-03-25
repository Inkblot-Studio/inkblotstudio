import type { FrameContext, ISystem } from '@/types';
import { damp } from '@/utils/math';

/**
 * Audio System.
 * Generates an ambient, cinematic drone using Web Audio API oscillators,
 * so we don't need external assets. Also performs real-time frequency analysis
 * to drive shader parameters (audio-reactive visuals).
 */
export class AudioSystem implements ISystem {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private masterGain: GainNode | null = null;

  private dataArray: Uint8Array | null = null;
  private initialized = false;
  private isPlaying = false;

  /** Smoothed overall volume level [0, 1] derived from low frequencies. */
  public lowFrequencyVolume = 0;
  
  /** Smoothed overall volume level [0, 1] derived from high frequencies. */
  public highFrequencyVolume = 0;

  private btnElement: HTMLElement | null = null;
  private textElement: HTMLElement | null = null;

  init(_ctx: FrameContext): void {
    this.btnElement = document.getElementById('audio-toggle');
    this.textElement = this.btnElement?.querySelector('span') || null;

    if (this.btnElement) {
      this.btnElement.addEventListener('click', this.toggleAudio);
    }
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

      // Slightly detune to create beating / chorusing effect
      osc.type = index % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq + (Math.random() - 0.5) * 1.0; 

      // Panning wide
      panner.pan.value = (Math.random() - 0.5) * 1.5;

      // Lowpass filter for deep cinematic feel
      filter.type = 'lowpass';
      filter.frequency.value = 200 + Math.random() * 200;
      filter.Q.value = 1;

      // Lower gain for higher pitches
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

  private toggleAudio = async (): Promise<void> => {
    if (!this.initialized) {
      await this.initAudio();
    }

    if (!this.audioCtx || !this.masterGain) return;

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.isPlaying = !this.isPlaying;

    // Fade in / out
    const now = this.audioCtx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    
    if (this.isPlaying) {
      this.masterGain.gain.linearRampToValueAtTime(1.0, now + 2.0);
      if (this.btnElement) this.btnElement.classList.add('playing');
      if (this.textElement) this.textElement.innerText = 'Audio: On';
    } else {
      this.masterGain.gain.linearRampToValueAtTime(0.01, now + 1.0);
      this.masterGain.gain.setValueAtTime(0, now + 1.1);
      if (this.btnElement) this.btnElement.classList.remove('playing');
      if (this.textElement) this.textElement.innerText = 'Audio: Off';
    }
  };

  update(ctx: FrameContext): void {
    if (!this.analyser || !this.dataArray || !this.isPlaying) {
      // Decay visual volumes if audio is off
      this.lowFrequencyVolume = damp(this.lowFrequencyVolume, 0, 5, ctx.delta);
      this.highFrequencyVolume = damp(this.highFrequencyVolume, 0, 5, ctx.delta);
      return;
    }

    this.analyser.getByteFrequencyData(this.dataArray as any);

    // Calculate average for low frequencies (bins 0-10)
    let lowSum = 0;
    const lowCount = 10;
    for (let i = 0; i < lowCount; i++) {
      lowSum += this.dataArray[i];
    }
    const targetLow = (lowSum / lowCount) / 255.0;

    // Calculate average for high frequencies (bins 30-50)
    let highSum = 0;
    const highCount = 20;
    for (let i = 30; i < 30 + highCount; i++) {
      highSum += this.dataArray[i];
    }
    const targetHigh = (highSum / highCount) / 255.0;

    // Smooth values to prevent jitter
    this.lowFrequencyVolume = damp(this.lowFrequencyVolume, targetLow, 10, ctx.delta);
    this.highFrequencyVolume = damp(this.highFrequencyVolume, targetHigh, 10, ctx.delta);
  }

  dispose(): void {
    if (this.btnElement) {
      this.btnElement.removeEventListener('click', this.toggleAudio);
    }
    this.oscillators.forEach(osc => osc.stop());
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }
}
