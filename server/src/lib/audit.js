// Audit logging helpers — works against Supabase (AuditLog table) with local JSON fallback.
// Never throws: audit failures must not break user actions.

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gzqqrgbwgqskgscpnqwr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY;

const headers = () => ({
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'return=representation'
});

const q = (table) => `${SUPABASE_URL}/rest/v1/${table}`;

const isTestEnv = process.env.NODE_ENV === 'test';
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');

const readLocalDb = () => {
  try {
    if (!fs.existsSync(DB_FILE)) return { auditLogs: [] };
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return { auditLogs: [] };
  }
};

const writeLocalDb = (data) => {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Audit local write failed:', err.message);
  }
};

/**
 * Record an audit event. Fire-and-forget safe.
 * @param {Object} entry
 * @param {string} entry.userId - who did it
 * @param {string} entry.action - e.g. PRODUCT_CREATE, PRODUCT_DELETE, LOGIN, LANGUAGE_CHANGE, PAYMENT_SAVE
 * @param {string} [entry.entityType] - PRODUCT | USER | PAYMENT | EXPORT | SESSION
 * @param {string} [entry.entityId] - id of the affected record
 * @param {Object} [entry.details] - extra structured info
 * @param {string} [entry.ip]
 * @param {string} [entry.userAgent]
 */
async function logAudit(entry) {
  try {
    const record = {
      userId: entry.userId || null,
      action: entry.action,
      entityType: entry.entityType || null,
      entityId: entry.entityId ? String(entry.entityId) : null,
      details: entry.details ? JSON.stringify(entry.details) : null,
      ip: entry.ip || null,
      userAgent: entry.userAgent || null,
      createdAt: new Date().toISOString()
    };

    if (!isTestEnv && SUPABASE_KEY) {
      try {
        const res = await fetch(q('AuditLog'), {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(record),
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) return true;
      } catch (err) {
        // fall through to local
      }
    }

    // Local fallback
    const local = readLocalDb();
    if (!Array.isArray(local.auditLogs)) local.auditLogs = [];
    local.auditLogs.unshift({ id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...record });
    // Cap local log at 1000 entries
    if (local.auditLogs.length > 1000) local.auditLogs = local.auditLogs.slice(0, 1000);
    writeLocalDb(local);
    return true;
  } catch (err) {
    console.error('logAudit failed (non-blocking):', err.message);
    return false;
  }
}

/**
 * Fetch audit logs for a user (newest first).
 */
async function getAuditLogs(userId, limit = 100) {
  if (!isTestEnv && SUPABASE_KEY) {
    try {
      const res = await fetch(`${q('AuditLog')}?userId=eq.${encodeURIComponent(userId)}&order=createdAt.desc&limit=${limit}`, {
        headers: headers(),
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) return rows;
      }
    } catch (err) {
      // fall through to local
    }
  }

  const local = readLocalDb();
  return (local.auditLogs || []).filter(l => String(l.userId) === String(userId)).slice(0, limit);
}

/**
 * Fetch the platform-wide audit trail (admin only — no user filter).
 */
async function getAllAuditLogs(limit = 200) {
  if (!isTestEnv && SUPABASE_KEY) {
    try {
      const res = await fetch(`${q('AuditLog')}?order=createdAt.desc&limit=${limit}`, {
        headers: headers(),
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) return rows;
      }
    } catch {
      // fall through to local
    }
  }
  const local = readLocalDb();
  return (local.auditLogs || []).slice(0, limit);
}

module.exports = { logAudit, getAuditLogs, getAllAuditLogs };
