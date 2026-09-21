const jwt = require('jsonwebtoken');
const db = require('../db');

// Fail fast: never fall back to a guessable secret (admin token forgery risk).
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to server/.env before starting the server.');
}

// Admin identity: role === 'admin' on the user record, or listed in ADMIN_EMAILS env.
function isAdminEmail(email) {
  const list = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(String(email || '').toLowerCase());
}

async function isAdminUser(userId) {
  try {
    const user = await db.findUserById(userId);
    if (!user) return false;
    return user.role === 'admin' || isAdminEmail(user.email);
  } catch {
    return false;
  }
}

const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const admin = await isAdminUser(decoded.userId);
    if (!admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = { requireAdmin, isAdminUser, isAdminEmail };
