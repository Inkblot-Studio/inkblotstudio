import { contactFormDryRun } from '@/config/contactForm.config';

const WEB3_URL = 'https://api.web3forms.com/submit';

export type ContactPayload = {
  name: string;
  email: string;
  message: string;
  subject: string;
  botcheck: string;
};

export type Web3SubmitResult = { ok: true } | { ok: false; message: string };

/**
 * Resolves the Web3Forms access key: env first, then `data-access-key` on the form.
 */
export function resolveWeb3AccessKey(form: HTMLFormElement | null = null): string | null {
  const fromEnv = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (form) {
    const raw = form.dataset.accessKey?.trim() ?? '';
    if (raw && !raw.includes('REPLACE')) {
      return raw;
    }
  }
  return null;
}

/**
 * Submits the contact form to Web3Forms or simulates success when `contactFormDryRun` is on.
 */
export async function submitContact(
  accessKey: string | null,
  payload: ContactPayload,
): Promise<Web3SubmitResult> {
  if (contactFormDryRun) {
    await new Promise((r) => {
      window.setTimeout(r, 220);
    });
    return { ok: true };
  }
  if (!accessKey) {
    return {
      ok: false,
      message:
        'Form not configured. Add your Web3Forms access key: .env (VITE_WEB3FORMS_ACCESS_KEY) or data-access-key on the form.',
    };
  }
  const body: Record<string, string> = {
    access_key: accessKey,
    name: payload.name,
    email: payload.email,
    message: payload.message,
    subject: payload.subject,
  };
  if (payload.botcheck) {
    body.botcheck = payload.botcheck;
  }
  try {
    const res = await fetch(WEB3_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      error?: string;
    };
    if (res.ok && data.success === true) {
      return { ok: true };
    }
    const msg =
      (typeof data.message === 'string' && data.message) ||
      (typeof data.error === 'string' && data.error) ||
      (res.status === 400
        ? 'Please check the fields and try again.'
        : 'Could not send. Try again or email us.');
    return { ok: false, message: msg };
  } catch {
    return { ok: false, message: 'Network error. Check your connection or email us directly.' };
  }
}
