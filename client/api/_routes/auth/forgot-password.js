import { db } from '../_lib/db.js';
import { normalizeIdentifier, describeIdentifier, maskIdentifier } from '../_lib/identifier.js';

/**
 * POST /api/auth/forgot-password
 *
 * Forwards a merchant password reset request to the store administrator queue.
 * The administrator reviews the request in the Admin Console, verifies identity,
 * and either issues a temporary password (which can be shared via WhatsApp/Email)
 * or rejects the reset.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const rawIdentifier = body.identifier || body.email || body.phone;
    const sellerNote = (body.note || body.message || '').trim().slice(0, 300);

    if (!rawIdentifier) {
      return res.status(400).json({ error: describeIdentifier() });
    }

    const normalized = normalizeIdentifier(rawIdentifier);
    if (!normalized) {
      return res.status(400).json({ error: describeIdentifier() });
    }

    const user = await db.findUserByIdentifier(rawIdentifier);
    if (!user) {
      return res.status(404).json({
        error: 'No account found matching that email or mobile number. Please check for typos or request onboarding access.'
      });
    }

    if (user.isActive === false || (user.status && user.status !== 'active')) {
      return res.status(403).json({
        error: 'This store account is currently deactivated. Please contact platform administration.'
      });
    }

    // Check if there is already an open reset request for this user
    const pending = await db.findAccessRequests('pending');
    const existing = pending.find(r => 
      r.source === 'password_reset' && 
      (r.provisionedUserId === user.id || (user.email && r.email === user.email))
    );

    if (existing) {
      return res.status(200).json({
        ok: true,
        pending: true,
        message: 'A password reset request for your account is already pending review with the administrator. They will share your temporary password soon.'
      });
    }

    // Create password reset request for admin approval
    const requestRecord = await db.createAccessRequest({
      name: user.name,
      businessName: `${user.name} (Password Reset)`,
      email: user.email || null,
      phone: user.phone || null,
      message: sellerNote ? `Password reset requested: "${sellerNote}"` : 'Seller requested password reset from login page.',
      source: 'password_reset',
      status: 'pending',
      provisionedUserId: user.id
    });

    db.insertAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'ACCESS_REQUEST',
      entityId: requestRecord?.id || user.id,
      details: JSON.stringify({
        what: `Password reset request submitted for ${maskIdentifier(rawIdentifier)}`,
        note: sellerNote || null,
        when: new Date().toISOString()
      }),
      ip: req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null,
      createdAt: new Date().toISOString()
    }).catch(() => {});

    return res.status(201).json({
      ok: true,
      submitted: true,
      message: 'Your password reset request has been sent to the store administrator. Once approved, the admin will share your temporary access credentials with you.',
      identifier: user.email || user.phone
    });
  } catch (err) {
    console.error('Forgot password request error:', err);
    return res.status(500).json({ error: 'Failed to submit password reset request. Please try again or contact support.' });
  }
}
