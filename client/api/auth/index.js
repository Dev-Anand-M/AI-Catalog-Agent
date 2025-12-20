import { PrismaClient } from '@prisma/client';
import { generateToken, verifyToken, hashPassword, comparePassword } from '../_lib/auth.js';

const prisma = new PrismaClient();

async function handleSignup(req, res) {
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

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });
  
  if (existingUser) {
    return res.status(400).json({ error: 'Validation failed', details: { email: 'Email is already registered' } });
  }

  const passwordHash = await hashPassword(password);
  
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash
    }
  });

  const token = generateToken(user);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
}

async function handleLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Invalid credentials' });

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });
  
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
}

async function handleMe(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const decoded = verifyToken(authHeader.split(' ')[1]);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  });
  
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  res.json({ user: { id: user.id, name: user.name, email: user.email } });
}

export default async function handler(req, res) {
  try {
    const action = req.query.action;
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL not set');
      return res.status(500).json({ error: 'Database not configured' });
    }
    
    if (req.method === 'POST') {
      if (action === 'signup') return await handleSignup(req, res);
      if (action === 'login') return await handleLogin(req, res);
    }
    if (req.method === 'GET' && action === 'me') return await handleMe(req, res);
    
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Auth error:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
