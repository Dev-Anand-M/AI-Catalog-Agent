import { db } from '../../../_lib/db.js';
import { requireAdmin } from '../../../_lib/adminGuard.js';

/** POST /api/admin/access-requests/:id/reject */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const id = req.query.id;
    const request = await db.findAccessRequestById(id);
    if (!request) return res.status(404).json({ error: 'Access request not found' });
    if (request.status === 'approved') {
      return res.status(409).json({ error: 'This request was already approved — an account exists for it.' });
    }

    const reason = String(req.body?.reason || '').trim().slice(0, 500) || null;

    await db.updateAccessRequest(id, {
      status: 'rejected',
      reviewedBy: req.userEmail || String(req.userId),
      reviewedAt: new Date().toISOString(),
      reviewNote: reason
    });

    db.insertAuditLog({
      userId: req.userId,
      action: 'ACCESS_REQUEST_REJECT',
      entityType: 'ACCESS_REQUEST',
      entityId: id,
      details: JSON.stringify({
        what: `Admin ${req.userEmail || req.userId} declined "${request.businessName || request.name}"`,
        when: new Date().toISOString(),
        why: reason
      }),
      ip: req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null,
      createdAt: new Date().toISOString()
    }).catch(() => {});

    res.json({ ok: true });
  } catch (error) {
    console.error('Admin reject access-request error:', error.message);
    res.status(500).json({ error: error.message || 'Could not decline the request' });
  }
}

export default requireAdmin(handler);
