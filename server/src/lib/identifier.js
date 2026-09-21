// Sign-in identifier helpers — a merchant types either their email address or their
// mobile number into ONE field, so that decision has to be made the same way on every
// surface (login, account provisioning, admin approval). Keep this module dependency-free.
//
// Phone numbers are stored and compared in E.164 form (`+919876543210`). That is the
// format every SMS/OTP provider expects, so turning OTP sign-in on later is a provider
// configuration change rather than a data migration.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Default country for numbers entered without a country code (product is India-first).
const DEFAULT_COUNTRY_CODE = '+91';

function isEmail(value) {
  return EMAIL_PATTERN.test(String(value || '').trim());
}

/**
 * Normalise a typed phone number to E.164, or return null if it can't be a phone number.
 * Accepts: "9876543210", "098765 43210", "+91 98765 43210", "+1 415 555 0132".
 */
function normalizePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const explicitCountryCode = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (!explicitCountryCode) {
    if (digits.length === 10) return DEFAULT_COUNTRY_CODE + digits;            // bare mobile
    if (digits.length === 11 && digits.startsWith('0')) return DEFAULT_COUNTRY_CODE + digits.slice(1);
    if (digits.length === 12 && digits.startsWith(DEFAULT_COUNTRY_CODE.slice(1))) return '+' + digits;
  }

  // Already international (or long enough that we trust it as-is)
  if (digits.length >= 8 && digits.length <= 15) return '+' + digits;
  return null;
}

/**
 * Classify a login identifier.
 * @returns {{ kind: 'email'|'phone', value: string } | null} null when it is neither.
 */
function normalizeIdentifier(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (isEmail(raw)) return { kind: 'email', value: raw.toLowerCase() };
  return null;
}

/** Human-friendly hint used in validation errors. */
function describeIdentifier() {
  return 'Please enter the email address linked to your store account';
}

/** Last 4 digits, for masking a phone number in audit logs. */
function maskIdentifier(identifier) {
  const parsed = normalizeIdentifier(identifier);
  if (!parsed) return String(identifier || '').slice(0, 3) + '***';
  if (parsed.kind === 'email') {
    const [name, domain] = parsed.value.split('@');
    const head = name.slice(0, 2);
    return `${head}***@${domain}`;
  }
  return `******${parsed.value.slice(-4)}`;
}

module.exports = { isEmail, normalizePhone, normalizeIdentifier, describeIdentifier, maskIdentifier };
