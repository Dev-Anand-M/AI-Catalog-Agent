import bcrypt from 'bcryptjs';
import { db } from '../_lib/db.js';
import { getUserIdFromRequest } from '../_lib/auth.js';

/** Password policy for passwords the merchant chooses themselves. */
function describePasswordProblem(password) {
  const value = String(password || '');
  if (value.length < 8) return 'Use at least 8 characters';
  if (!/[A-Za-z]/.test(value)) return 'Include at least one letter';
  if (!/[0-9]/.test(value)) return 'Include at least one number';
  if (/^(?:password|12345678|qwerty)/i.test(value)) return 'That password is too easy to guess';
  return null;
}

/**
 * POST /api/auth/change-password
 *
 * Every store we provision starts on a temporary password, so the first sign-in ends
 * here before the workspace opens.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await db.findUserById(userId);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Enter your current password and the new one' });
    }

    // Legacy accounts may still hold a non-bcrypt hash; compare either way.
    const currentValid = String(user.passwordHash || '').startsWith('$2')
      ? await bcrypt.compare(currentPassword, user.passwordHash)
      : currentPassword === user.passwordHash;

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

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.updateUser(userId, { passwordHash, mustChangePassword: false });

    db.insertAuditLog({
      userId,
      action: 'PASSWORD_CHANGE',
      entityType: 'USER',
      entityId: userId,
      details: JSON.stringify({ what: 'Password changed by the account owner' }),
      ip: req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null,
      createdAt: new Date().toISOString()
    }).catch(() => {});

    res.json({ ok: true, message: 'Your password has been updated' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'We could not update your password. Please try again.' });
  }
}
