import { users, generateToken, verifyToken, hashPassword, comparePassword } from '../_lib/auth.js';

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

  const existingUser = users.find(u => u.email === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: 'Validation failed', details: { email: 'Email is already registered' } });
  }

  const user = {
    id: Date.now().toString(),
    name: name.trim(),
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString()
  };
  users.push(user);

  const token = generateToken(user);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
}

async function handleLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Invalid credentials' });

  const user = users.find(u => u.email === email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
}

function handleMe(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const user = verifyToken(authHeader.split(' ')[1]);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  res.json({ user: { id: user.id, name: user.name, email: user.email } });
}

export default async function handler(req, res) {
  try {
    const action = req.query.action;
    
    if (req.method === 'POST') {
      if (action === 'signup') return await handleSignup(req, res);
      if (action === 'login') return await handleLogin(req, res);
    }
    if (req.method === 'GET' && action === 'me') return handleMe(req, res);
    
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
