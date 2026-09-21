const express = require('express');
const { logAudit, getAuditLogs } = require('../lib/audit');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/audit — current user's audit trail (newest first)
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const logs = await getAuditLogs(req.userId, limit);
    res.json(logs);
  } catch (error) {
    console.error('Audit fetch error:', error);
    res.status(500).json({ error: 'Failed to load audit log' });
  }
});

// POST /api/audit — record a client-side event (e.g. EXPORT_CSV, PAGE_VIEW)
router.post('/', async (req, res) => {
  try {
    const { action, entityType, entityId, details } = req.body || {};
    if (!action) {
      return res.status(400).json({ error: 'action is required' });
    }
    await logAudit({
      userId: req.userId,
      action: String(action).toUpperCase().slice(0, 64),
      entityType: entityType ? String(entityType).slice(0, 32) : null,
      entityId: entityId ? String(entityId).slice(0, 64) : null,
      details: details && typeof details === 'object' ? details : undefined,
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Audit write error:', error);
    res.status(500).json({ error: 'Failed to record audit event' });
  }
});

module.exports = router;
