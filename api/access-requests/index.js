import { db } from '../_lib/db.js';
import { isEmail, normalizePhone } from '../_lib/identifier.js';

const ALLOWED_CATEGORIES = [
  'Clothing', 'Grocery', 'Handicraft', 'Jewelry', 'Electronics', 'Footwear', 'Home & Kitchen', 'Other'
];

/**
 * POST /api/access-requests
 *
 * The only public way onto the platform: a merchant describes their store, our team
 * reviews it, and approving the request provisions the account.
 *
 * Note: rate limiting lives on the Express API (express-rate-limit). Serverless
 * instances share no memory, so a durable limit here would need a shared store.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};

    const name = String(body.name || '').trim();
    const businessName = String(body.businessName || '').trim();
    const rawEmail = String(body.email || '').trim();
    const rawPhone = String(body.phone || '').trim();
    const city = String(body.city || '').trim();
    const category = String(body.category || '').trim();
    const message = String(body.message || '').trim();

    const details = {};
    if (name.length < 2) details.name = 'Please tell us your name';
    if (!rawEmail) {
      details.email = 'Please provide an email address so we can reach you';
    } else if (!isEmail(rawEmail)) {
      details.email = 'That email address does not look right';
    }
    if (businessName.length > 200) details.businessName = 'Please keep the store name under 200 characters';

    if (Object.keys(details).length > 0) {
      return res.status(400).json({ error: 'Please check the highlighted fields', details });
    }

    const email = rawEmail.toLowerCase();
    const phone = rawPhone ? normalizePhone(rawPhone) : null;

    // Idempotent: a re-submit while the request is still open must not add noise to
    // the onboarding queue.
    const pending = await db.findAccessRequests('pending');
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

    db.insertAuditLog({
      userId: null,
      action: 'ACCESS_REQUEST_SUBMIT',
      entityType: 'ACCESS_REQUEST',
      entityId: created.id,
      details: JSON.stringify({
        what: `New access request from "${businessName || name}"`,
        when: new Date().toISOString(),
        city: city || null,
        category: category || null
      }),
      ip: req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null,
      createdAt: new Date().toISOString()
    }).catch(() => {});

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
}
