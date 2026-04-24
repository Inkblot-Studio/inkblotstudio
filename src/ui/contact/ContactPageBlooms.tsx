import type { ReactElement } from 'react';

import './ContactPageBlooms.css';

/**
 * Fixed ornamental blooms (2D) echoing the nav floral control — not interactive.
 */
function MiniBloom({ className, seed }: { className: string; seed: number }): ReactElement {
  const n = 6;
  const rot = (seed * 17) % 360;
  return (
    <div className={`contact-bloom-wrap ${className}`}>
      <svg
        className="contact-bloom__svg"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g transform={`translate(32,32) rotate(${rot})`}>
          {Array.from({ length: n }, (_, i) => (
            <ellipse
              key={i}
              rx={9 + (seed % 3)}
              ry={19 + (seed % 4)}
              fill="currentColor"
              transform={`rotate(${i * (360 / n)})`}
            />
          ))}
          <circle r={4.2 + (seed % 2) * 0.4} fill="currentColor" className="contact-bloom__core" />
        </g>
      </svg>
    </div>
  );
}

export function ContactPageBlooms(): ReactElement {
  return (
    <div className="contact-page__bloom-scene" aria-hidden="true">
      <MiniBloom className="contact-page__bloom contact-page__bloom--a" seed={1} />
      <MiniBloom className="contact-page__bloom contact-page__bloom--b" seed={7} />
      <MiniBloom className="contact-page__bloom contact-page__bloom--c" seed={13} />
      <MiniBloom className="contact-page__bloom contact-page__bloom--d" seed={3} />
      <MiniBloom className="contact-page__bloom contact-page__bloom--e" seed={21} />
    </div>
  );
}
