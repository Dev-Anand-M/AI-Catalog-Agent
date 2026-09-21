import { db } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/adminGuard.js';

/**
 * GET /api/admin/access-requests?status=pending
 *
 * The onboarding review queue. Path-based to match the client and the Express API.
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const status = req.query?.status || 'all';
    const requests = (await db.findAccessRequests(status)) || [];
    const counts = requests.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});
    res.json({ requests, counts });
  } catch (error) {
    console.error('Admin access-requests error:', error.message);
    res.status(500).json({ error: 'Could not load access requests' });
  }
}

export default requireAdmin(handler);
