import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { closeContactAndRestore, restoreScrollAfterContact } from '@/navigation/contactRouteBridge';
import { contactPageInner, contactPageMist, contactPageSky } from '@/ui/contact/contactPageMotion';
import { useInterfaceAudio } from '@/ui/useInterfaceAudio';
import { submitContact, resolveWeb3AccessKey } from '@/utils/contactFormSubmit';
import {
  contactFieldId,
  type ContactFormField,
  validateContactFields,
} from '@/utils/contactFormValidation';

import './ContactPage.css';

const MAIL = 'ai.support@inkblotstudio.eu';
const MAIL_GENERAL_HREF = `mailto:${MAIL}?subject=${encodeURIComponent('General — Inkblot Studio')}`;
const PHONE_TEL = '+359882797806';
const PHONE_HREF = `tel:${PHONE_TEL}`;
const PHONE_LABEL = '+359 882 797 806';
const STUDIO_LOCATION = 'Sofia, Bulgaria';

function IntentArrow() {
  return (
    <span className="contact-page__intent-arrow" aria-hidden="true">
      ↘
    </span>
  );
}

const EASE = [0.25, 0.48, 0.35, 0.99] as const;

const swapTransition = (reduce: boolean) =>
  reduce
    ? { duration: 0.15 }
    : { duration: 0.4, ease: EASE as [number, number, number, number] };

function generalLineVariants(reduce: boolean) {
  if (reduce) {
    return { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.12 } } };
  }
  return {
    hidden: { opacity: 0, y: 9 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.38, ease: EASE as [number, number, number, number] },
    },
  };
}

function generalPanelVariants(reduce: boolean) {
  if (reduce) {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.15 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    };
  }
  return {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: EASE as [number, number, number, number],
        when: 'beforeChildren' as const,
        staggerChildren: 0.09,
        delayChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      y: -8,
      transition: { duration: 0.28, ease: EASE as [number, number, number, number] },
    },
  };
}

function generalEmailHeroVariants(reduce: boolean) {
  if (reduce) {
    return { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.12 } } };
  }
  return {
    hidden: {},
    show: {
      transition: {
        when: 'beforeChildren' as const,
        staggerChildren: 0.1,
        delayChildren: 0.02,
      },
    },
  };
}

export function ContactPage() {
  const reduce = useReducedMotion();
  const { playHover, playClick } = useInterfaceAudio();
  const formRef = useRef<HTMLFormElement>(null);
  const [intent, setIntent] = useState<'work' | 'general'>('work');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gLine = generalLineVariants(!!reduce);
  const gPanel = generalPanelVariants(!!reduce);
  const gEmailHero = generalEmailHeroVariants(!!reduce);
  const skyV = contactPageSky(!!reduce);
  const mistV = contactPageMist(!!reduce);
  const innerV = contactPageInner(!!reduce);

  useLayoutEffect(() => {
    document.body.classList.add('contact-page-open');
    document.body.style.overflow = 'hidden';
    const y0 = window.scrollY || document.documentElement.scrollTop || 0;
    if (y0 > 2) {
      const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: instant ? 'auto' : 'smooth' });
    }

    return () => {
      document.body.classList.remove('contact-page-open');
      if (!document.body.classList.contains('site-drawer-open')) {
        document.body.style.removeProperty('overflow');
      }
      restoreScrollAfterContact();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeContactAndRestore();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const clearFieldInvalid = useCallback(() => {
    for (const id of Object.values(contactFieldId)) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.classList.remove('contact-page__input--invalid', 'contact-page__textarea--invalid');
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    }
  }, []);

  const setFieldInvalid = useCallback((field: ContactFormField) => {
    const id = contactFieldId[field];
    const el = document.getElementById(id);
    if (!el) return;
    const isTa = el.tagName === 'TEXTAREA';
    el.classList.add(isTa ? 'contact-page__textarea--invalid' : 'contact-page__input--invalid');
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-describedby', 'contact-page-error');
  }, []);

  useEffect(() => {
    setError(null);
    clearFieldInvalid();
  }, [intent, clearFieldInvalid]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;
    clearFieldInvalid();
    setError(null);

    const fd = new FormData(form);
    const name = String(fd.get('name') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim();
    const message = String(fd.get('message') ?? '').trim();
    const botcheck = String(fd.get('botcheck') ?? '');
    if (botcheck.length > 0) {
      return;
    }

    const v = validateContactFields(name, email, message);
    if (v) {
      setError(v.message);
      setFieldInvalid(v.field);
      document.getElementById(contactFieldId[v.field])?.focus({ preventScroll: true });
      return;
    }

    const accessKey = resolveWeb3AccessKey(form);
    const subject = 'Inkblot Studio — New work / project';

    setSending(true);
    const result = await submitContact(accessKey, {
      name,
      email,
      message,
      subject,
      botcheck,
    });
    setSending(false);
    if (result.ok) {
      setSuccess(true);
      window.setTimeout(() => {
        closeContactAndRestore();
      }, 3000);
    } else {
      setError(result.message);
    }
  };

  const onInput = (e: React.FormEvent) => {
    const t = e.target as HTMLElement;
    if (!t.id?.startsWith('contact-')) {
      return;
    }
    t.classList.remove('contact-page__input--invalid', 'contact-page__textarea--invalid');
    t.removeAttribute('aria-invalid');
    t.removeAttribute('aria-describedby');
  };

  return (
    <div className="contact-page-3d-root">
      <motion.main
        className={`contact-page contact-page--sky${sending ? ' contact-page--sending' : ''}${
          success ? ' contact-page--success' : ''
        }`}
        role="main"
        aria-label="Contact Inkblot Studio"
        id="contact-page-root"
        variants={skyV}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <motion.div
          className="contact-page__mist"
          aria-hidden="true"
          variants={mistV}
          initial="initial"
          animate="animate"
          exit="exit"
        />
        <motion.div
          className="contact-page__inner"
          variants={innerV}
          initial="initial"
          animate="animate"
        >
        <div className="contact-page__center">
          <div className="contact-page__intro">
            <h1
              className="contact-page__hero contact-page__hero--ref"
              id="contact-page-heading"
            >
              <span className="contact-page__hero-line">Say</span>
              <span className="contact-page__hero-line">hello</span>
            </h1>
            <p className="contact-page__kicker contact-page__kicker--sheet">
              We look forward to hearing from you
            </p>
            <div
              className="contact-page__intents"
              role="group"
              aria-label="How would you like to reach us?"
            >
              <button
                type="button"
                className="contact-page__intent"
                aria-pressed={intent === 'work'}
                onClick={() => {
                  playClick();
                  setIntent('work');
                }}
                onPointerEnter={playHover}
              >
                New business <IntentArrow />
              </button>
              <button
                type="button"
                className="contact-page__intent"
                aria-pressed={intent === 'general'}
                onClick={() => {
                  playClick();
                  setIntent('general');
                }}
                onPointerEnter={playHover}
              >
                General <IntentArrow />
              </button>
            </div>
          </div>

            <div className="contact-page__swap-shell">
              <AnimatePresence mode="wait" initial={false}>
                {intent === 'work' ? (
                  <motion.div
                    key="work"
                    className="contact-page__swap-panel contact-page__swap-panel--work"
                    role="region"
                    aria-label="New business form"
                    initial={reduce ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -10 }}
                    transition={swapTransition(!!reduce)}
                  >
                    <div className="contact-page__views">
                      <form
                        ref={formRef}
                        id="contact-page-form"
                        className="contact-page__form"
                        noValidate
                        onSubmit={onSubmit}
                        onInput={onInput}
                        data-access-key="REPLACE_ACCESS_KEY"
                      >
                        <input
                          type="text"
                          name="botcheck"
                          className="contact-page__hp"
                          tabIndex={-1}
                          autoComplete="off"
                          aria-hidden="true"
                        />
                        <div>
                          <label className="contact-page__label" htmlFor="contact-name">
                            Name
                          </label>
                          <input
                            className="contact-page__input"
                            type="text"
                            id="contact-name"
                            name="name"
                            required
                            minLength={2}
                            maxLength={120}
                            autoComplete="name"
                            placeholder="Your name"
                          />
                        </div>
                        <div>
                          <label className="contact-page__label" htmlFor="contact-email">
                            Email
                          </label>
                          <input
                            className="contact-page__input"
                            type="email"
                            id="contact-email"
                            name="email"
                            required
                            maxLength={254}
                            inputMode="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                          />
                        </div>
                        <div>
                          <label className="contact-page__label" htmlFor="contact-message">
                            Message
                          </label>
                          <textarea
                            className="contact-page__textarea"
                            id="contact-message"
                            name="message"
                            required
                            minLength={10}
                            maxLength={8000}
                            rows={4}
                            placeholder="Tell us about the project, timeline, and goals."
                          />
                        </div>
                        {error ? (
                          <p className="contact-page__error" id="contact-page-error" role="alert">
                            {error}
                          </p>
                        ) : null}
                        <button
                          type="submit"
                          className="contact-page__submit"
                          disabled={sending || success}
                          onClick={() => playClick()}
                          onPointerEnter={playHover}
                        >
                          <span className="contact-page__send-label">Send</span>
                          <span className="contact-page__send-busy" aria-hidden>
                            Sending
                          </span>
                        </button>
                      </form>

                      <div className="contact-page__success" aria-hidden={!success} tabIndex={-1}>
                        <p className="contact-page__success-k">Done</p>
                        <p className="contact-page__success-t">Thank you. We will get back to you soon.</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="general"
                    className="contact-page__swap-panel contact-page__swap-panel--general"
                    role="region"
                    aria-label="Email and phone"
                    aria-live="polite"
                    variants={gPanel}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                  >
                    <motion.div className="contact-page__email-hero" variants={gEmailHero} initial="hidden" animate="show">
                      <motion.a
                        className="contact-page__email-link"
                        href={MAIL_GENERAL_HREF}
                        variants={gLine}
                      >
                        {MAIL}
                      </motion.a>
                      <motion.div className="contact-page__offices" role="list" variants={gLine}>
                        <div className="contact-page__office" role="listitem">
                          <p className="contact-page__office-label">Studio</p>
                          <p className="contact-page__office-line">{STUDIO_LOCATION}</p>
                        </div>
                        <div className="contact-page__office" role="listitem">
                          <p className="contact-page__office-label">Call</p>
                          <a className="contact-page__office-line contact-page__office-line--link" href={PHONE_HREF}>
                            {PHONE_LABEL}
                          </a>
                        </div>
                      </motion.div>
                      <motion.p className="contact-page__email-lede" variants={gLine}>
                        For day-to-day questions, partnerships, and everything that isn’t a new brief.
                      </motion.p>
                      <motion.p className="contact-page__email-hint" variants={gLine}>
                        <button
                          type="button"
                          className="contact-page__link-as-btn"
                          onClick={() => {
                            playClick();
                            setIntent('work');
                          }}
                          onPointerEnter={playHover}
                        >
                          Have a new project? Use the form
                        </button>
                      </motion.p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
        </div>
      </motion.div>
      </motion.main>
    </div>
  );
}
