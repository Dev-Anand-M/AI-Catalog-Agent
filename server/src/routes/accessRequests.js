const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { logAudit } = require('../lib/audit');
const { isEmail, normalizePhone } = require('../lib/identifier');

const router = express.Router();

// Public, unauthenticated, and it writes to the database — so it needs a ceiling.
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this device. Please try again later, or call us directly.' }
});

const ALLOWED_CATEGORIES = [
  'Clothing', 'Grocery', 'Handicraft', 'Jewelry', 'Electronics', 'Footwear', 'Home & Kitchen', 'Other'
];

/**
 * POST /api/access-requests
 *
 * The only public way onto the platform. A merchant (or the person helping them)
 * describes their store; our team reviews it and provisions the account.
 */
router.post('/', submitLimiter, async (req, res) => {
  try {
    const body = req.body || {};

    const name = String(body.name || '').trim();
    const businessName = String(body.businessName || '').trim();
    const rawEmail = String(body.email || '').trim();
    const rawPhone = String(body.phone || '').trim();
    const city = String(body.city || '').trim();
    const category = String(body.category || '').trim();
    const message = String(body.message || '').trim();

    const errors = {};
    if (name.length < 2) errors.name = 'Please tell us your name';
    if (!rawEmail) {
      errors.email = 'Please provide an email address so we can reach you';
    } else if (!isEmail(rawEmail)) {
      errors.email = 'That email address does not look right';
    }
    if (businessName.length > 200) errors.businessName = 'Please keep the store name under 200 characters';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Please check the highlighted fields', details: errors });
    }

    const email = rawEmail.toLowerCase();
    const phone = rawPhone ? normalizePhone(rawPhone) : null;

    // Idempotent: re-submitting while a request is still open must not create noise
    // for whoever reviews the queue.
    const pending = (await db.findAccessRequests('pending')) || [];
    const duplicate = pending.find(r => email && r.email === email);
    if (duplicate) {
      return res.status(200).json({
        ok: true,
        duplicate: true,
        request: { id: duplicate.id, status: duplicate.status, createdAt: duplicate.createdAt },
        message: 'We already have your request and our team is on it. We will reach out shortly.'
      });
    }

    const created = await db.createAccessRequest({
      name,
      businessName: businessName || null,
      email,
      phone,
      city: city || null,
      category: ALLOWED_CATEGORIES.includes(category) ? category : null,
      message: message || null,
      source: 'website'
    });

    logAudit({
      userId: null,
      action: 'ACCESS_REQUEST_SUBMIT',
      entityType: 'ACCESS_REQUEST',
      entityId: created.id,
      details: {
        what: `New access request from "${businessName || name}"`,
        when: new Date().toISOString(),
        city: city || null,
        category: category || null
      },
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null
    });

    return res.status(201).json({
      ok: true,
      request: { id: created.id, status: created.status, createdAt: created.createdAt },
      message: 'Request received. Our team reviews every store personally and will contact you within one working day.'
    });
  } catch (error) {
    console.error('Access request error:', error.message);
    return res.status(503).json({
      error: 'We could not save your request right now. Please try again in a moment, or call us directly.'
    });
  }
});

router.all('/', (req, res) => {
  res.status(405).json({ error: 'Method not allowed' });
});

module.exports = router;
