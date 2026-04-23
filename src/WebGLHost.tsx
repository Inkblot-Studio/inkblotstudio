import { useEffect } from 'react';

import type { Inkblot } from './inkblotApp';
import { reportEngineResult } from './ui/loading/engineResult';

/**
 * Keeps the Three.js loop outside React render; loads the engine in a separate chunk.
 */
export function WebGLHost() {
  useEffect(() => {
    let ink: Inkblot | null = null;
    let cancelled = false;

    void import('./inkblotBootstrap')
      .then((mod) => {
        if (cancelled) return;
        const el = document.getElementById('canvas-container');
        if (!el) {
          console.error('[Inkblot] Missing #canvas-container');
          return;
        }
        ink = mod.mountInkblot(el);
        reportEngineResult(true);
      })
      .catch((err) => {
        console.error('[Inkblot] Failed to load engine chunk', err);
        reportEngineResult(false, err);
      });

    return () => {
      cancelled = true;
      ink?.dispose();
    };
  }, []);

  return null;
}
