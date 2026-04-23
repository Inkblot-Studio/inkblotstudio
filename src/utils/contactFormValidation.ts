const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactFormField = 'name' | 'email' | 'message';

export type ContactValidationError = {
  message: string;
  field: ContactFormField;
};

const LIMITS = {
  name: { min: 2, max: 120 },
  message: { min: 10, max: 8000 },
} as const;

/**
 * Returns `null` if valid, otherwise a single user-facing error (first failure).
 */
export function validateContactFields(
  name: string,
  email: string,
  message: string,
): ContactValidationError | null {
  const n = name.trim();
  if (n.length < LIMITS.name.min) {
    return { message: `Please add your name (at least ${LIMITS.name.min} characters).`, field: 'name' };
  }
  if (n.length > LIMITS.name.max) {
    return { message: 'Name is too long.', field: 'name' };
  }
  const e = email.trim();
  if (e.length === 0) {
    return { message: 'Please enter your email address.', field: 'email' };
  }
  if (!EMAIL_RE.test(e)) {
    return { message: 'Please enter a valid email address.', field: 'email' };
  }
  const m = message.trim();
  if (m.length < LIMITS.message.min) {
    return {
      message: `Please add a few more details (at least ${LIMITS.message.min} characters).`,
      field: 'message',
    };
  }
  if (m.length > LIMITS.message.max) {
    return { message: 'Message is too long. Please shorten it.', field: 'message' };
  }
  return null;
}

export const contactFieldId: Record<ContactFormField, string> = {
  name: 'contact-name',
  email: 'contact-email',
  message: 'contact-message',
};
