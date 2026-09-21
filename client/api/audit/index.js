import { db } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

async function handler(req, res) {
  if (req.method === 'GET') {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const logs = await db.findAuditLogsByUserId(req.userId, limit);
    return res.json(logs);
  }

  if (req.method === 'POST') {
    const { action, entityType, entityId, details } = req.body || {};
    if (!action) {
      return res.status(400).json({ error: 'action is required' });
    }
    const record = {
      userId: req.userId,
      action: String(action).toUpperCase().slice(0, 64),
      entityType: entityType ? String(entityType).slice(0, 32) : null,
      entityId: entityId ? String(entityId).slice(0, 64) : null,
      details: details && typeof details === 'object' ? JSON.stringify(details) : null,
      ip: req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null,
      createdAt: new Date().toISOString()
    };
    const saved = await db.insertAuditLog(record);
    return res.status(201).json({ ok: true, log: saved });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
