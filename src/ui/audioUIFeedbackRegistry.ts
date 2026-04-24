import type { AudioSystem } from '@/systems/audioSystem';

let registered: AudioSystem | null = null;

/** Called from `initNavChrome` with the app’s audio; cleared on engine dispose. */
export function registerAudioForReactUI(audio: AudioSystem | null): void {
  registered = audio;
}

export function getAudioForReactUI(): AudioSystem | null {
  return registered;
}
