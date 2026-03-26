import { useEffect } from 'react';

import type { Inkblot } from './inkblotApp';

/**
 * Keeps the Three.js loop outside React render; loads the engine in a separate chunk.
 */
export function WebGLHost() {
  useEffect(() => {
    let ink: Inkblot | null = null;
    let cancelled = false;

    void import('./inkblotBootstrap').then((mod) => {
      if (cancelled) return;
      const el = document.getElementById('canvas-container');
      if (!el) return;
      ink = mod.mountInkblot(el);
    });

    return () => {
      cancelled = true;
      ink?.dispose();
    };
  }, []);

  return null;
}
