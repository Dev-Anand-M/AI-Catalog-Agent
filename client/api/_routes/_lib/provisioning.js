import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { normalizePhone } from './identifier.js';

const SAFE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 — readable over a phone call

/**
 * A first password the merchant has to read off a screen or hear on a call.
 * Grouped with a dash because "K7PM-2XQ4" survives being dictated, "K7PM2XQ4" does not.
 */
export function generateTemporaryPassword() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  // 256 is a clean multiple of the 32-char alphabet, so modulo introduces no bias.
  const chars = Array.from(bytes, b => SAFE_ALPHABET[b % SAFE_ALPHABET.length]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

/**
 * Turn an approved access request into a real store account.
 * @throws {Error} with `.status` when it can't be provisioned.
 */
export async function provisionAccountFromRequest(request, overrides = {}) {
  if (request.status && request.status !== 'pending') {
    const error = new Error(`This request was already ${request.status}.`);
    error.status = 409;
    throw error;
  }

  const name = String(overrides.name || request.businessName || request.name || '').trim();
  const email = String(overrides.email || request.email || '').trim().toLowerCase() || null;
  const phone = normalizePhone(overrides.phone || request.phone) || null;

  if (!name) {
    const error = new Error('A merchant name is required before provisioning.');
    error.status = 400;
    throw error;
  }
  if (!email) {
    const error = new Error('Provide an email address for the account.');
    error.status = 400;
    throw error;
  }

  const existing = await db.findUserByEmail(email);
  if (existing) {
    const error = new Error(`An account already exists for ${email}. Share a password reset instead of creating a duplicate.`);
    error.status = 409;
    throw error;
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const user = await db.createUser({
    name,
    email,
    phone: null,
    // Access requests are onboarding submissions for seller store workspaces.
    role: 'user',
    isActive: true,
    language: null,
    mustChangePassword: true,
    passwordHash
  });

  if (!user || !user.id) {
    const error = new Error('The account could not be created (no user row returned).');
    error.status = 500;
    throw error;
  }

  return { user, temporaryPassword };
}
