import { getDb } from '../_lib/db.js';
import { generateToken, verifyToken, hashPassword, comparePassword } from '../_lib/auth.js';

async function handleSignup(req, res) {
  const sql = getDb();
  const { name, email, password, confirmPassword } = req.body;
  
  const errors = {};
  if (!name?.trim()) errors.name = 'Name is required';
  if (!email?.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email format';
  if (!password || password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
  
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const existing = await sql`SELECT id FROM "User" WHERE email = ${email.toLowerCase()}`;
  if (existing.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: { email: 'Email is already registered' } });
  }

  const passwordHash = await hashPassword(password);
  
  const result = await sql`
    INSERT INTO "User" (name, email, "passwordHash", "createdAt")
    VALUES (${name.trim()}, ${email.toLowerCase()}, ${passwordHash}, NOW())
    RETURNING id, name, email
  `;
  
  const user = result[0];
  const token = generateToken(user);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
}

async function handleLogin(req, res) {
  const sql = getDb();
  const { email, password } = req.body;
  
  if (!email || !password) return res.status(400).json({ error: 'Invalid credentials' });

  const result = await sql`SELECT id, name, email, "passwordHash" FROM "User" WHERE email = ${email.toLowerCase()}`;
  
  if (result.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
  
  const user = result[0];
  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
}

async function handleMe(req, res) {
  const sql = getDb();
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const decoded = verifyToken(authHeader.split(' ')[1]);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

  const result = await sql`SELECT id, name, email FROM "User" WHERE id = ${decoded.userId}`;
  
  if (result.length === 0) return res.status(401).json({ error: 'Unauthorized' });

  const user = result[0];
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
}

export default async function handler(req, res) {
  try {
    const action = req.query.action;
    
    if (req.method === 'POST') {
      if (action === 'signup') return await handleSignup(req, res);
      if (action === 'login') return await handleLogin(req, res);
    }
    if (req.method === 'GET' && action === 'me') return await handleMe(req, res);
    
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
