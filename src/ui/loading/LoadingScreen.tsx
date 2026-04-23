import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { getEngineResult } from './engineResult';

import './loadingScreen.css';

const PHRASES = [
  'Tuning the bloom',
  'Calibrating the light',
  'Stitching atmosphere',
  'Warming the glass',
  'Almost with you',
] as const;

const TIPS = ['Realtime 3D', 'Scroll-native', 'Production-grade', 'Studio build'] as const;

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const phraseVariants = {
  enter: { opacity: 0, y: 6, transition: { duration: 0.28, ease: EASE } },
  center: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
  leave: { opacity: 0, y: -6, transition: { duration: 0.28, ease: EASE } },
};

const backdropVariants = {
  visible: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: {
    opacity: 0,
    scale: 1.02,
    filter: 'blur(16px)',
    transition: { duration: 0.72, ease: EASE },
  },
};

export interface LoadingScreenProps {
  onExitComplete: () => void;
}

const TITLE = 'Inkblot';

/** Show the shell at least this long (success path) so the motion and copy can land. */
const MIN_LOADING_MS = 3000;

function usePhraseRotation(intervalMs: number) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % PHRASES.length);
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return [PHRASES[index]!, index] as const;
}

const markVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.12 } },
};

const charVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: EASE },
  },
};

type OrbDef = { left: string; top: string; w: string; h: string; o: number; kx: number; ky: number; hue: 'ice' | 'violet' };

const ORB_DEFS: readonly OrbDef[] = [
  { left: '8%', top: '12%', w: 'min(42vw, 18rem)', h: 'min(42vw, 18rem)', o: 0.42, kx: 1, ky: 0.65, hue: 'ice' },
  { left: '72%', top: '58%', w: 'min(44vw, 19rem)', h: 'min(44vw, 19rem)', o: 0.35, kx: -0.85, ky: 1, hue: 'violet' },
  { left: '48%', top: '6%', w: 'min(26vw, 11rem)', h: 'min(26vw, 11rem)', o: 0.26, kx: 0.4, ky: 0.35, hue: 'ice' },
  { left: '4%', top: '62%', w: 'min(20vw, 9rem)', h: 'min(20vw, 9rem)', o: 0.2, kx: 0.6, ky: -0.5, hue: 'violet' },
];

function LoadingOrb({ def, ox, oy, index }: { def: OrbDef; ox: MotionValue<number>; oy: MotionValue<number>; index: number }) {
  const x = useTransform(ox, (v) => (v - 0.5) * 24 * def.kx);
  const y = useTransform(oy, (v) => (v - 0.5) * 20 * def.ky);
  const bg =
    def.hue === 'ice'
      ? 'color-mix(in srgb, #22d3ee 55%, #0ea5e9)'
      : 'color-mix(in srgb, #a78bfa 50%, #6366f1)';

  return (
    <motion.div
      className="loading-screen__orb"
      style={{
        left: def.left,
        top: def.top,
        width: def.w,
        height: def.h,
        x,
        y,
        background: bg,
        opacity: def.o,
      }}
      animate={{ scale: [1, 1.07, 1] }}
      transition={{
        duration: 5.2 + index * 0.35,
        repeat: Number.POSITIVE_INFINITY,
        ease: 'easeInOut',
      }}
    />
  );
}

export function LoadingScreen({ onExitComplete }: LoadingScreenProps) {
  const reduceMotion = useReducedMotion();
  const labelId = useId();
  const [phase, setPhase] = useState<'load' | 'exit' | 'err'>('load');
  const [phrase, phraseIdx] = usePhraseRotation(reduceMotion ? 8000 : 2400);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 40, damping: 30, mass: 0.45 });
  const sy = useSpring(my, { stiffness: 40, damping: 30, mass: 0.45 });
  const gLeft = useTransform(sx, [0, 1], [10, 90]);
  const gTop = useTransform(sy, [0, 1], [14, 86]);
  const glow = useMotionTemplate`radial-gradient(circle at ${gLeft}% ${gTop}%, color-mix(in srgb, #22d3ee 20%, transparent), transparent 52%)`;
  const exitDoneRef = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    document.documentElement.setAttribute('aria-busy', 'true');
    return () => {
      document.documentElement.removeAttribute('aria-busy');
    };
  }, []);

  useEffect(() => {
    let active = true;
    void getEngineResult().then((r) => {
      if (!active) return;
      if (!r.ok) {
        setPhase('err');
        document.documentElement.removeAttribute('aria-busy');
        return;
      }
      const waitMs = Math.max(0, MIN_LOADING_MS - (Date.now() - mountTimeRef.current));
      window.setTimeout(() => {
        if (!active) return;
        if (reduceMotion) {
          exitDoneRef.current = true;
          document.documentElement.removeAttribute('aria-busy');
          onExitComplete();
        } else {
          setPhase('exit');
        }
      }, waitMs);
    });
    return () => {
      active = false;
    };
  }, [onExitComplete, reduceMotion]);

  /** Failsafe if a browser quirk omits the exit variant callback (0.72s + buffer). */
  useEffect(() => {
    if (phase !== 'exit' || reduceMotion) return;
    const t = window.setTimeout(() => {
      if (exitDoneRef.current) return;
      exitDoneRef.current = true;
      document.documentElement.removeAttribute('aria-busy');
      onExitComplete();
    }, 1000);
    return () => window.clearTimeout(t);
  }, [phase, reduceMotion, onExitComplete]);

  const onPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduceMotion) return;
      const r0 = e.currentTarget.getBoundingClientRect();
      mx.set((e.clientX - r0.left) / r0.width);
      my.set((e.clientY - r0.top) / r0.height);
    },
    [mx, my, reduceMotion],
  );

  return (
    <AnimatePresence mode="wait">
      {phase !== 'err' && (
        <motion.div
          key="load-shell"
          className={reduceMotion ? 'loading-screen loading-screen--reduced' : 'loading-screen'}
          style={reduceMotion ? undefined : { background: glow }}
          initial="visible"
          animate={phase === 'exit' ? 'exit' : 'visible'}
          variants={backdropVariants}
          onPointerMove={onPointer}
          onAnimationComplete={() => {
            if (phaseRef.current !== 'exit' || exitDoneRef.current) return;
            exitDoneRef.current = true;
            document.documentElement.removeAttribute('aria-busy');
            onExitComplete();
          }}
          role="status"
          aria-busy={phase === 'load' || phase === 'exit'}
          aria-labelledby={labelId}
        >
          <div className="loading-screen__grain" aria-hidden />

          {!reduceMotion && ORB_DEFS.map((d, i) => <LoadingOrb key={i} def={d} ox={sx} oy={sy} index={i} />)}

          <div className="loading-screen__frame">
            <p className="loading-screen__eyebrow" id={labelId}>
              Inkblot Studio
            </p>

            <motion.div
              className="loading-screen__mark"
              aria-hidden
              initial="hidden"
              animate="show"
              variants={markVariants}
            >
              {TITLE.split('').map((ch, i) => (
                <motion.span key={`${i}-${ch}`} className="loading-screen__letter" variants={charVariants}>
                  {ch}
                </motion.span>
              ))}
            </motion.div>

            <p className="loading-screen__sub">Cinematic experience</p>

            <div className="loading-screen__phrase" role="text">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={phraseIdx}
                  variants={phraseVariants}
                  initial="enter"
                  animate="center"
                  exit="leave"
                >
                  {phrase}
                </motion.span>
              </AnimatePresence>
            </div>

            <p className="loading-screen__hint">Preparing the scene for you</p>

            <div className="loading-screen__bar" aria-hidden>
              <div className="loading-screen__bar-fill" />
            </div>

            <div className="loading-screen__chips">
              {TIPS.map((t) => (
                <span key={t} className="loading-screen__chip">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      {phase === 'err' && (
        <motion.div
          key="err"
          className="loading-screen loading-screen--reduced"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alert"
        >
          <div className="loading-screen__grain" aria-hidden />
          <div className="loading-screen__frame">
            <p className="loading-screen__error">The scene could not be prepared.</p>
            <button type="button" className="loading-screen__retry" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
