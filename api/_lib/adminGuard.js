import { db } from './db.js';
import { requireAuth } from './auth.js';

export function isAdminEmail(email) {
  const list = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(String(email || '').toLowerCase());
}

/**
 * Wrap an admin handler so the caller must be a signed-in admin. Mirrors the Express
 * `requireAdmin` middleware: an admin is either role === 'admin' or listed in ADMIN_EMAILS.
 */
export function requireAdmin(handler) {
  return requireAuth(async (req, res) => {
    try {
      const user = await db.findUserById(req.userId);
      if (!user || (user.role !== 'admin' && !isAdminEmail(user.email))) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      req.userEmail = user.email || null;
      return handler(req, res);
    } catch (error) {
      console.error('Admin guard error:', error.message);
      return res.status(500).json({ error: 'Could not verify admin access' });
    }
  });
}
