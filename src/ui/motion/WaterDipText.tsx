import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, type ReactNode } from 'react';

import { makeWaterDipCharVariants, type WaterDipCharCustom } from './waterDipTextVariants';
import { buildWaterDipRanks, maxWaterDipRank } from './waterDipRanks';
import './WaterDipText.css';

const motionTags: Record<string, typeof motion.h1> = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  div: motion.div,
  span: motion.span,
};

function resolveLines(text: string | undefined, lines: string[] | undefined): string[] {
  if (lines?.length) return lines.filter((l) => l.length > 0);
  if (text == null) return [];
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

export type WaterDipTextProps = {
  /** Multi-line without `\n` — each entry is one line (e.g. `['Say','hello']`) */
  lines?: string[];
  /** Alternatively, use `\n` to separate lines */
  text?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span';
  className?: string;
  lineClassName?: string;
  charClassName?: string;
  /** Added to all glyphs; wave runs last-letter-first within each word, then the next word */
  startDelay?: number;
  /** Time (s) between steps along the per-word, end→start “dip” */
  stagger?: number;
  /** Subtle “surface” sheen behind the copy */
  surface?: boolean;
  /** `aria-label` on the host (glyphs are `aria-hidden`) */
  ariaLabel?: string;
  id?: string;
  children?: ReactNode;
  onAnimationComplete?: () => void;
};

export function WaterDipText({
  lines: linesProp,
  text,
  as: Tag = 'div',
  className = '',
  lineClassName = '',
  charClassName = '',
  startDelay = 0.04,
  stagger = 0.048,
  surface = true,
  ariaLabel,
  id,
  children,
  onAnimationComplete,
}: WaterDipTextProps) {
  const reduce = useReducedMotion() ?? false;
  const lineStrings = useMemo(() => resolveLines(text, linesProp), [text, linesProp]);
  const segments = useMemo(() => buildWaterDipRanks(lineStrings), [lineStrings]);
  const maxRank = useMemo(() => maxWaterDipRank(segments), [segments]);
  const charVariants = useMemo(
    () => makeWaterDipCharVariants({ stagger, reduce, startDelay }),
    [stagger, reduce, startDelay],
  );
  const Motion = motionTags[Tag] ?? motionTags.div!;

  useEffect(() => {
    if (!onAnimationComplete || segments.length === 0) return;
    const lastGlyphDelayS = startDelay + maxRank * stagger;
    const durationMs = reduce ? 180 : 720;
    const t = globalThis.setTimeout(
      onAnimationComplete,
      lastGlyphDelayS * 1000 + durationMs,
    );
    return () => clearTimeout(t);
  }, [onAnimationComplete, segments.length, maxRank, startDelay, stagger, reduce]);

  const rootClass = [
    'water-dip-text',
    surface && 'water-dip-text--surface',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (lineStrings.length === 0) {
    return (
      <Motion className={rootClass} id={id} aria-label={ariaLabel}>
        {children}
      </Motion>
    );
  }

  const byLine: ReactNode[] = [];
  for (let li = 0; li < lineStrings.length; li++) {
    const lineSegs = segments.filter((s) => s.line === li);
    byLine.push(
      <div
        // eslint-disable-next-line react/no-array-index-key -- stable line order
        key={`line-${li}`}
        className={['water-dip-text__line', lineClassName].filter(Boolean).join(' ')}
        aria-hidden="true"
      >
        {lineSegs.map(({ ch, key, rank }) => {
          const custom: WaterDipCharCustom = { rank };
          if (ch === ' ') {
            return (
              <motion.span
                key={key}
                className={['water-dip-text__char', 'water-dip-text__space', charClassName]
                  .filter(Boolean)
                  .join(' ')}
                style={{ transformStyle: 'preserve-3d' }}
                custom={custom}
                variants={charVariants}
                initial="hidden"
                animate="show"
                aria-hidden="true"
              >
                &nbsp;
              </motion.span>
            );
          }
          return (
            <motion.span
              key={key}
              className={['water-dip-text__char', charClassName].filter(Boolean).join(' ')}
              style={{ transformStyle: 'preserve-3d' }}
              custom={custom}
              variants={charVariants}
              initial="hidden"
              animate="show"
            >
              {ch}
            </motion.span>
          );
        })}
      </div>,
    );
  }

  return (
    <Motion
      className={rootClass}
      id={id}
      aria-label={ariaLabel}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {byLine}
    </Motion>
  );
}
