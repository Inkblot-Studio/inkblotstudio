import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';

import { WORK_PARTNERS, WORK_SUBTITLE, WORK_TAGLINE, WORK_TITLE } from '@/data/workSectionContent';

const item = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.04 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/**
 * Act 2 — portfolio / work. Driven by --journey-work-ui from the scroll engine.
 */
export function WorkSectionPanel() {
  const [workUi, setWorkUi] = useState(0);
  const smooth = useSpring(0, { stiffness: 150, damping: 26, mass: 0.42 });

  useEffect(() => {
    let r = 0;
    const read = () => {
      const raw = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--journey-work-ui').trim() || '0',
      );
      if (!Number.isNaN(raw)) {
        setWorkUi((prev) => (Math.abs(prev - raw) > 0.001 ? raw : prev));
        smooth.set(raw);
      }
      r = requestAnimationFrame(read);
    };
    r = requestAnimationFrame(read);
    return () => cancelAnimationFrame(r);
  }, [smooth]);

  const y = useTransform(smooth, [0, 1], [20, 0]);
  const listPhase = workUi > 0.08 ? 'show' : 'hidden';

  return (
    <div className="journey-work__inner">
      <motion.header className="journey-work__head" style={{ opacity: smooth, y }}>
        <p className="journey-work__kicker">Portfolio</p>
        <h2 className="journey-work__title">{WORK_TITLE}</h2>
        <p className="journey-work__lede">{WORK_SUBTITLE}</p>
        <p className="journey-work__tagline">{WORK_TAGLINE}</p>
      </motion.header>

      <motion.ul
        className="journey-work__list"
        initial="hidden"
        animate={listPhase}
        style={{ opacity: smooth }}
        variants={{
          show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
        }}
      >
        {WORK_PARTNERS.map((p, i) => (
          <motion.li
            key={p.id}
            className="journey-work__row"
            custom={i}
            variants={item}
          >
            <span className="journey-work__name">{p.name}</span>
            <span className="journey-work__context">{p.context}</span>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}
