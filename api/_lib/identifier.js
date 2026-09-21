// Sign-in identifier helpers for the Vercel serverless API — the ESM twin of
// server/src/lib/identifier.js. Keep the two in sync: login, provisioning and admin
// approval all have to agree on what a valid email or mobile number looks like.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEFAULT_COUNTRY_CODE = '+91';

export function isEmail(value) {
  return EMAIL_PATTERN.test(String(value || '').trim());
}

/** Normalise a typed phone number to E.164, or null when it can't be one. */
export function normalizePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const explicitCountryCode = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (!explicitCountryCode) {
    if (digits.length === 10) return DEFAULT_COUNTRY_CODE + digits;
    if (digits.length === 11 && digits.startsWith('0')) return DEFAULT_COUNTRY_CODE + digits.slice(1);
    if (digits.length === 12 && digits.startsWith(DEFAULT_COUNTRY_CODE.slice(1))) return '+' + digits;
  }

  if (digits.length >= 8 && digits.length <= 15) return '+' + digits;
  return null;
}

/** @returns {{ kind: 'email'|'phone', value: string } | null} */
export function normalizeIdentifier(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (isEmail(raw)) return { kind: 'email', value: raw.toLowerCase() };
  return null;
}

export function describeIdentifier() {
  return 'Please enter the email address linked to your store account';
}

/** Mask an identifier for logs — never record a merchant's full contact details. */
export function maskIdentifier(identifier) {
  const parsed = normalizeIdentifier(identifier);
  if (!parsed) return String(identifier || '').slice(0, 3) + '***';
  if (parsed.kind === 'email') {
    const [name, domain] = parsed.value.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return `******${parsed.value.slice(-4)}`;
}
