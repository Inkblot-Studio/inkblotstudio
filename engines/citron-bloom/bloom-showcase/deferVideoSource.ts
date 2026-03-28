/**
 * Attach `src` and start playback after idle — keeps decode/network off the critical path
 * (LCP-style wins on scroll-heavy pages with many video textures).
 */
export function deferVideoSource(video: HTMLVideoElement, src: string): void {
  video.preload = 'metadata';
  const run = () => {
    video.src = src;
    void video.play().catch(() => {});
  };
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(run, { timeout: 1800 });
  } else {
    window.setTimeout(run, 320);
  }
}
