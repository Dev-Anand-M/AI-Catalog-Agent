import bcrypt from 'bcryptjs';
import { db } from '../_lib/db.js';
import { signToken } from '../_lib/auth.js';
import { normalizeIdentifier, describeIdentifier, maskIdentifier } from '../_lib/identifier.js';

/**
 * POST /api/auth/login
 *
 * `identifier` is an email address OR a mobile number — one field, either credential
 * (the pattern Indian merchants already expect from Aadhaar/phone-first services).
 * `email` / `phone` remain accepted for older clients.
 *
 * OTP-ready: the matched user already carries `phone` in E.164 form plus
 * `phoneVerified`, so enabling SMS codes later adds a branch here rather than a
 * migration or a client change.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const identifier = body.identifier || body.email || body.phone;
    const password = (body.password || '').trim();

    if (!identifier) {
      return res.status(400).json({ error: describeIdentifier() });
    }
    if (!password) {
      return res.status(400).json({ error: 'Please enter your password' });
    }
    if (!normalizeIdentifier(identifier)) {
      return res.status(400).json({ error: describeIdentifier() });
    }

    const user = await db.findUserByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.isActive === false || (user.status && user.status !== 'active')) {
      return res.status(403).json({
        error: 'This store account is not active. Please contact support so we can help you get back in.'
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash || '');
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user.id);

    db.insertAuditLog({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'SESSION',
      entityId: user.id,
      details: JSON.stringify({ what: `Sign-in for ${maskIdentifier(identifier)}` }),
      ip: req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null,
      createdAt: new Date().toISOString()
    }).catch(() => {});

    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin = user.role === 'admin' || adminEmails.includes(String(user.email || '').toLowerCase());

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email || null,
        phone: user.phone || null,
        language: user.language || null,
        role: isAdmin ? 'admin' : (user.role || 'user'),
        mustChangePassword: !!user.mustChangePassword
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
}
