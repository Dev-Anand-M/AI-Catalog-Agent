import jwt from 'jsonwebtoken';

// Fail fast: never fall back to a guessable secret (token forgery risk).
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to the deployment environment variables.');
}

export function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function getUserIdFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  return decoded?.userId || null;
}

export function requireAuth(handler) {
  return async (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    req.userId = userId;
    return handler(req, res);
  };
}
