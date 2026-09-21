import { db } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { normalizePhone } from '../_lib/identifier.js';

const ALLOWED_LANGUAGES = ['en', 'hi', 'ta', 'te', 'kn', 'bn'];

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email || null,
    phone: user.phone || null,
    language: user.language || null,
    role: user.role || 'user',
    mustChangePassword: !!user.mustChangePassword
  };
}

async function handler(req, res) {
  if (req.method === 'GET') {
    const user = await db.findUserById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Shaped as { user } to match the Express API the client is written against.
    return res.json({ user: toPublicUser(user) });
  }

  if (req.method === 'PUT') {
    const { language, phone } = req.body || {};
    const patch = {};

    if (language !== undefined) {
      if (!ALLOWED_LANGUAGES.includes(language)) {
        return res.status(400).json({ error: 'Invalid language' });
      }
      patch.language = language;
    }

    // Linking a mobile number after provisioning lets the merchant sign in with either
    // credential. It stays unverified until an OTP provider confirms it.
    if (phone !== undefined) {
      const normalized = phone ? normalizePhone(phone) : null;
      if (!normalized) {
        return res.status(400).json({ error: 'Enter a valid mobile number, for example +91 98765 43210' });
      }
      const owner = await db.findUserByPhone(normalized);
      if (owner && String(owner.id) !== String(req.userId)) {
        return res.status(409).json({ error: 'That mobile number is already linked to another store account' });
      }
      patch.phone = normalized;
      patch.phoneVerified = false;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const updated = await db.updateUser(req.userId, patch);
    return res.json({ user: toPublicUser(updated) });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
