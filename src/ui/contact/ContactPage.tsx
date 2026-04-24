import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { closeContactAndRestore, restoreScrollAfterContact } from '@/navigation/contactRouteBridge';
import { ContactPageBlooms } from '@/ui/contact/ContactPageBlooms';
import { submitContact, resolveWeb3AccessKey } from '@/utils/contactFormSubmit';
import {
  contactFieldId,
  type ContactFormField,
  validateContactFields,
} from '@/utils/contactFormValidation';

import './ContactPage.css';

const HERO_WORDS = ['Say', 'hello'];
const MAIL = 'ai.support@inkblotstudio.eu';
const MAIL_GENERAL_HREF = `mailto:${MAIL}?subject=${encodeURIComponent('General — Inkblot Studio')}`;

function IntentArrow() {
  return (
    <span className="contact-page__intent-arrow" aria-hidden="true">
      ↘
    </span>
  );
}

export function ContactPage() {
  const reduce = useReducedMotion();
  const formRef = useRef<HTMLFormElement>(null);
  const [intent, setIntent] = useState<'work' | 'general'>('work');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const onClose = () => {
    closeContactAndRestore();
  };

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
      }, 2600);
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
    <main
      className={`contact-page contact-page--enter${sending ? ' contact-page--sending' : ''}${
        success ? ' contact-page--success' : ''
      }`}
      role="main"
      aria-label="Contact Inkblot Studio"
      id="contact-page-root"
    >
      <button type="button" className="contact-page__close" onClick={onClose} aria-label="Close and return">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <ContactPageBlooms />
      <div className="contact-page__inner">
        <div className="contact-page__grid">
          <div className="contact-page__col contact-page__col--copy">
            <h1
              className="contact-page__hero contact-page__hero--ref"
              id="contact-page-heading"
            >
              {HERO_WORDS.map((w, i) => (
                <motion.span
                  key={w}
                  className="contact-page__hero-line"
                  style={{ display: 'inline-block', marginRight: '0.28em' }}
                  initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.08, duration: 0.45, ease: [0.25, 0.48, 0.35, 0.99] }}
                  whileHover={
                    reduce
                      ? undefined
                      : {
                          y: -3,
                          transition: { duration: 0.22, ease: [0.25, 0.48, 0.35, 0.99] },
                        }
                  }
                >
                  {w}
                </motion.span>
              ))}
            </h1>
            <p className="contact-page__kicker">We look forward to hearing from you</p>
          </div>

          <div className="contact-page__col contact-page__col--action">
            <span className="contact-page__marker" aria-hidden="true" />
            <div className="contact-page__intents" role="group" aria-label="How would you like to reach us?">
              <button
                type="button"
                className="contact-page__intent"
                aria-pressed={intent === 'work'}
                onClick={() => setIntent('work')}
              >
                New work <IntentArrow />
              </button>
              <button
                type="button"
                className="contact-page__intent"
                aria-pressed={intent === 'general'}
                onClick={() => setIntent('general')}
              >
                General <IntentArrow />
              </button>
            </div>

            {intent === 'work' ? (
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
                  <button type="submit" className="contact-page__submit" disabled={sending || success}>
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
            ) : (
              <div className="contact-page__email-hero" aria-live="polite">
                <a className="contact-page__email-link" href={MAIL_GENERAL_HREF}>
                  {MAIL}
                </a>
                <p className="contact-page__email-lede">For day-to-day questions, partnerships, and everything that isn’t a new brief.</p>
                <p className="contact-page__email-hint">
                  <button type="button" className="contact-page__link-as-btn" onClick={() => setIntent('work')}>
                    Have a new project? Use the form
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
