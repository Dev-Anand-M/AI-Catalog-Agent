const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { logAudit } = require('../lib/audit');
const {
  normalizeIdentifier,
  normalizePhone,
  describeIdentifier,
  maskIdentifier
} = require('../lib/identifier');

const router = express.Router();

// Credential guessing is the one place brute force is worth slowing down.
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please wait a few minutes and try again.' }
});

// Fail fast: a missing JWT_SECRET must never fall back to a guessable value.
// (A known fallback lets attackers forge valid tokens.)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to server/.env before starting the server.');
}
const SALT_ROUNDS = 10;

const isProductionLike = () => process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test';

/**
 * Sign-in is identifier-based: a merchant types EITHER their email address OR their
 * mobile number into a single field (the same way Aadhaar/phone-first services work).
 *
 * OTP-ready: numbers are stored in E.164 form and every account carries
 * `phoneVerified` / `mustChangePassword` flags, so adding SMS one-time codes later is
 * a provider configuration change — no schema migration and no client rewrite.
 * The password check below is the only branch that would need a sibling.
 */

// Rewrite ?action=query requests to path-based routes
router.use((req, res, next) => {
  if (req.query.action) {
    req.url = '/' + req.query.action;
  }
  next();
});

// POST /api/auth/signup
//
// Deliberately disabled. Store accounts are provisioned by our team once an access
// request is approved (POST /api/access-requests, reviewed in the Admin portal), which
// is how the merchant gets a verified, supported, production-ready account instead of
// an empty self-serve shell. The route stays so older clients get a clear answer
// instead of a confusing 404.
router.post('/signup', (req, res) => {
  res.status(403).json({
    error: 'Self-serve sign-up is disabled. Request access and our team will set up your store with you.',
    code: 'SIGNUP_DISABLED',
    requestAccessUrl: '/request-access'
  });
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    // `identifier` is the current field (email OR mobile). `email` / `phone` stay
    // accepted so cached clients and the demo shortcut keep working.
    const body = req.body || {};
    const identifier = body.identifier || body.email || body.phone;
    const providedPass = (body.password || '').trim();

    if (!identifier) {
      return res.status(400).json({ error: describeIdentifier() });
    }
    if (!providedPass) {
      return res.status(400).json({ error: 'Please enter your password' });
    }

    const parsed = normalizeIdentifier(identifier);
    if (!parsed) {
      return res.status(400).json({ error: describeIdentifier() });
    }

    // Find user
    const user = await db.findUserByIdentifier(identifier);

    if (!user) {
      const detailed = `No account found for "${maskIdentifier(identifier)}"`;
      return res.status(401).json({
        error: isProductionLike() ? 'Invalid credentials' : detailed
      });
    }

    if (user.isActive === false || (user.status && user.status !== 'active')) {
      return res.status(403).json({
        error: 'This store account is not active. Please contact support so we can help you get back in.'
      });
    }

    // User exists, verify password
    let isValidPassword = false;
    if (user.passwordHash && providedPass) {
      try {
        if (user.passwordHash.startsWith('$2')) {
          isValidPassword = await bcrypt.compare(providedPass, user.passwordHash);
        } else {
          // Check SHA256 or plain fallback for legacy accounts
          const crypto = require('crypto');
          const sha256 = crypto.createHash('sha256').update(providedPass).digest('hex');
          if (sha256 === user.passwordHash || providedPass === user.passwordHash) {
            isValidPassword = true;
            // Upgrade to bcrypt hash
            try {
              const newHash = await bcrypt.hash(providedPass, SALT_ROUNDS);
              const supUrl = process.env.SUPABASE_URL || 'https://gzqqrgbwgqskgscpnqwr.supabase.co';
              const supKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
              if (supKey) {
                await fetch(`${supUrl}/rest/v1/User?id=eq.${user.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': supKey,
                    'Authorization': `Bearer ${supKey}`
                  },
                  body: JSON.stringify({ passwordHash: newHash })
                });
              }
            } catch (upgradeErr) {
              // ignore upgrade error
            }
          }
        }
      } catch (e) {
        isValidPassword = false;
      }
    }

    if (!isValidPassword) {
      return res.status(401).json({
        error: isProductionLike() ? 'Invalid credentials' : `Wrong password for ${maskIdentifier(identifier)}`
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logAudit({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'SESSION',
      entityId: user.id,
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null
    });

    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const isUserAdmin = user.role === 'admin' || adminEmails.includes((user.email || '').toLowerCase());

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email || null,
        phone: user.phone || null,
        language: user.language || null,
        role: isUserAdmin ? 'admin' : (user.role || 'user'),
        mustChangePassword: !!user.mustChangePassword
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

/**
 * Password policy for passwords a merchant chooses themselves. Kept to the rules that
 * actually matter and phrased so a first-time user knows exactly what to change.
 */
function describePasswordProblem(password) {
  const value = String(password || '');
  if (value.length < 8) return 'Use at least 8 characters';
  if (!/[A-Za-z]/.test(value)) return 'Include at least one letter';
  if (!/[0-9]/.test(value)) return 'Include at least one number';
  if (/^(?:password|12345678|qwerty)/i.test(value)) return 'That password is too easy to guess';
  return null;
}

// POST /api/auth/change-password
// Every account created by the onboarding team starts on a temporary password, so the
// first sign-in has to end here before the workspace opens.
router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let decoded;
    try {
      decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await db.findUserById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Enter your current password and the new one' });
    }

    const currentValid = user.passwordHash && user.passwordHash.startsWith('$2')
      ? await bcrypt.compare(currentPassword, user.passwordHash)
      : (() => {
        const crypto = require('crypto');
        const sha256 = crypto.createHash('sha256').update(currentPassword).digest('hex');
        return sha256 === user.passwordHash || currentPassword === user.passwordHash;
      })();

    if (!currentValid) {
      return res.status(401).json({ error: 'Your current password is not correct' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: 'Please choose a different password',
        details: { newPassword: 'Your new password must differ from the temporary one' }
      });
    }

    const problem = describePasswordProblem(newPassword);
    if (problem) {
      return res.status(400).json({ error: problem, details: { newPassword: problem } });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.updateUser(user.id, { passwordHash, mustChangePassword: false });

    logAudit({
      userId: user.id,
      action: 'PASSWORD_CHANGE',
      entityType: 'USER',
      entityId: user.id,
      details: { what: 'Password changed by the account owner' },
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null
    });

    res.json({ ok: true, message: 'Your password has been updated' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'We could not update your password. Please try again.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body || {};
    if (!identifier) {
      return res.status(400).json({ error: describeIdentifier() });
    }

    const normalized = normalizeIdentifier(identifier);
    if (!normalized) {
      return res.status(400).json({ error: describeIdentifier() });
    }

    const user = await db.findUserByIdentifier(identifier);
    if (!user) {
      return res.status(404).json({
        error: 'No account found matching that email or mobile number. Please check for typos or request onboarding access.'
      });
    }

    if (user.isActive === false || (user.status && user.status !== 'active')) {
      return res.status(403).json({
        error: 'This store account is currently deactivated. Please contact platform administration.'
      });
    }

    const tempPassword = 'Seller1234';
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    await db.updateUser(user.id, {
      passwordHash,
      mustChangePassword: true
    });

    logAudit({
      userId: user.id,
      action: 'PASSWORD_RESET',
      entityType: 'USER',
      entityId: user.id,
      details: { what: `Password reset issued for ${maskIdentifier(identifier)}` },
      ip: req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null
    }).catch(() => {});

    return res.json({
      ok: true,
      message: 'Temporary password set. Please sign in now with this password — you will be prompted to create your new personal password immediately.',
      temporaryPassword: tempPassword,
      identifier: user.email || user.phone
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to reset password. Please try again later.' });
  }
});

// GET /api/auth/me - Get current user (protected)
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await db.findUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const isUserAdmin = user.role === 'admin' || adminEmails.includes((user.email || '').toLowerCase());

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email || null,
        phone: user.phone || null,
        language: user.language || null,
        role: isUserAdmin ? 'admin' : (user.role || 'user'),
        mustChangePassword: !!user.mustChangePassword
      }
    });
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

// PUT /api/auth/me — update current user profile (language preference persistence)
router.put('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { language, phone } = req.body || {};
    const patch = {};

    if (language !== undefined) {
      const ALLOWED = ['en', 'hi', 'ta', 'te', 'kn', 'bn'];
      if (!ALLOWED.includes(language)) {
        return res.status(400).json({ error: 'Invalid language' });
      }
      patch.language = language;
    }

    // Linking a mobile number after provisioning lets the merchant sign in with
    // either credential. It starts unverified until an OTP provider confirms it.
    if (phone !== undefined) {
      const normalized = phone ? normalizePhone(phone) : null;
      if (!normalized) {
        return res.status(400).json({ error: 'Enter a valid mobile number, for example +91 98765 43210' });
      }
      const owner = await db.findUserByPhone(normalized);
      if (owner && String(owner.id) !== String(user.id)) {
        return res.status(409).json({ error: 'That mobile number is already linked to another store account' });
      }
      patch.phone = normalized;
      patch.phoneVerified = false;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const updated = await db.updateUser(decoded.userId, patch);

    if (patch.language && patch.language !== user.language) {
      logAudit({
        userId: user.id,
        action: 'LANGUAGE_CHANGE',
        entityType: 'USER',
        entityId: user.id,
        details: { from: user.language || null, to: patch.language }
      });
    }

    if (patch.phone) {
      logAudit({
        userId: user.id,
        action: 'PHONE_LINK',
        entityType: 'USER',
        entityId: user.id,
        details: { phone: patch.phone }
      });
    }

    res.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email || null,
        phone: updated.phone || null,
        language: updated.language || null,
        role: updated.role || 'user',
        mustChangePassword: !!updated.mustChangePassword
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/auth/forgot-password — submit password reset request to admin
router.post('/forgot-password', async (req, res) => {
  try {
    const rawIdentifier = req.body?.identifier || req.body?.email || req.body?.phone;
    const sellerNote = String(req.body?.note || req.body?.message || '').trim().slice(0, 300);

    if (!rawIdentifier) {
      return res.status(400).json({ error: describeIdentifier() });
    }

    const normalized = normalizeIdentifier(rawIdentifier);
    if (!normalized) {
      return res.status(400).json({ error: describeIdentifier() });
    }

    const user = await db.findUserByIdentifier(rawIdentifier);
    if (!user) {
      return res.status(404).json({
        error: 'No account found matching that email or mobile number. Please check for typos or request onboarding access.'
      });
    }

    if (user.isActive === false || (user.status && user.status !== 'active')) {
      return res.status(403).json({
        error: 'This store account is currently deactivated. Please contact platform administration.'
      });
    }

    // Check if a pending reset already exists
    const pending = await db.findAccessRequests ? await db.findAccessRequests('pending') : [];
    const existing = pending.find(r => 
      r.source === 'password_reset' && 
      (r.provisionedUserId === user.id || (user.email && r.email === user.email))
    );

    if (existing) {
      return res.status(200).json({
        ok: true,
        pending: true,
        message: 'A password reset request for your account is already pending review with the administrator. They will share your temporary password soon.'
      });
    }

    const requestRecord = await db.createAccessRequest({
      name: user.name,
      businessName: `${user.name} (Password Reset)`,
      email: user.email || null,
      phone: user.phone || null,
      message: sellerNote ? `Password reset requested: "${sellerNote}"` : 'Seller requested password reset from login page.',
      source: 'password_reset',
      status: 'pending',
      provisionedUserId: user.id
    });

    logAudit({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'ACCESS_REQUEST',
      entityId: requestRecord?.id || user.id,
      details: {
        what: `Password reset request submitted for ${maskIdentifier(rawIdentifier)}`,
        note: sellerNote || null,
        when: new Date().toISOString()
      },
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null
    });

    res.status(201).json({
      ok: true,
      submitted: true,
      message: 'Your password reset request has been sent to the store administrator. Once approved, the admin will share your temporary access credentials with you.',
      identifier: user.email || user.phone
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to submit password reset request. Please try again or contact support.' });
  }
});

// Root handlers for ?action= query parameter support
router.post('/', (req, res) => {
  const action = req.query.action;
  if (action === 'signup') {
    req.url = '/signup';
    return router(req, res);
  }
  if (action === 'login') {
    req.url = '/login';
    return router(req, res);
  }
  if (action === 'forgot-password') {
    req.url = '/forgot-password';
    return router(req, res);
  }
  res.status(404).json({ error: 'Action not supported' });
});

router.get('/', (req, res) => {
  const action = req.query.action;
  if (action === 'me') {
    req.url = '/me';
    return router(req, res);
  }
  res.status(404).json({ error: 'Action not supported' });
});

module.exports = router;
