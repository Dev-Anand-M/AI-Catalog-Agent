/**
 * Week 1 Implementation: Authentication & JWT Session API Router
 * Developer: Dev Anand (Tech Lead)
 * Assigned Task: Voice Input & API Routes Setup
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./supabaseDriver');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-anand-tarot-club-secret-key-2026';
const SALT_ROUNDS = 10;

// URL action re-writer for query parameters (?action=signup)
router.use((req, res, next) => {
  if (req.query.action) {
    req.url = '/' + req.query.action;
  }
  next();
});

/**
 * POST /signup (or ?action=signup)
 * Register new shopkeeper profile
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Validation failed', details: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Validation failed', details: 'Password must be at least 6 characters long.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Validation failed', details: 'Passwords do not match.' });
    }

    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Validation failed', details: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await db.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email },
      token
    });
  } catch (error) {
    console.error('Signup Error:', error);
    return res.status(500).json({ error: 'Server error during user registration.' });
  }
});

/**
 * POST /login (or ?action=login)
 * Authenticate shopkeeper credentials
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Validation failed', details: 'Email and password are required.' });
    }

    const user = await db.findUserByEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials', details: 'No account found with this email.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials', details: 'Incorrect password.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Server error during login authentication.' });
  }
});

/**
 * GET /me (or ?action=me)
 * Validate bearer JWT token
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', details: 'Authorization bearer token missing.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await db.findUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
});

module.exports = router;
