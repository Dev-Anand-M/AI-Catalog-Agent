// Database connection using Supabase REST API
import { normalizePhone, normalizeIdentifier } from './identifier.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const headers = () => ({
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'return=representation'
});

const q = (table) => `${SUPABASE_URL}/rest/v1/${table}`;

/**
 * A Supabase call that throws with the response body attached. Silent failures here
 * are what make "the database is unreachable" look like "the feature is broken".
 */
async function request(label, url, init = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    const error = new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured');
    error.status = 503;
    throw error;
  }
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 240);
    } catch {
      detail = '';
    }
    const error = new Error(`Supabase rejected ${label} (HTTP ${res.status}): ${detail || 'no response body'}`);
    error.status = res.status;
    throw error;
  }
  const rows = await res.json().catch(() => null);
  return Array.isArray(rows) ? rows[0] : rows;
}

export const db = {
  // Users
  findUserByEmail: async (email) => {
    const res = await fetch(`${q('User')}?email=eq.${encodeURIComponent(email)}&limit=1`, { headers: headers() });
    const rows = await res.json();
    return rows[0] || null;
  },

  findUserById: async (id) => {
    const res = await fetch(`${q('User')}?id=eq.${id}&limit=1`, { headers: headers() });
    const rows = await res.json();
    return rows[0] || null;
  },

  createUser: async (data) => {
    const res = await fetch(q('User'), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    const rows = await res.json();
    return rows[0];
  },

  updateUser: async (id, data) => {
    const res = await fetch(`${q('User')}?id=eq.${id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(data)
    });
    const rows = await res.json();
    return Array.isArray(rows) ? rows[0] : rows;
  },

  // All users (admin portal)
  findAllUsers: async () => {
    const res = await fetch(`${q('User')}?order=createdAt.desc&limit=1000`, { headers: headers() });
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  },

  // All products (admin portal)
  findAllProducts: async () => {
    const res = await fetch(`${q('Product')}?order=createdAt.desc&limit=2000`, { headers: headers() });
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  },

  deleteUser: async (id) => {
    await fetch(`${q('User')}?id=eq.${id}`, { method: 'DELETE', headers: { ...headers(), 'Prefer': 'return=minimal' } });
    await fetch(`${q('Product')}?userId=eq.${id}`, { method: 'DELETE', headers: { ...headers(), 'Prefer': 'return=minimal' } });
    return true;
  },

  // All audit logs (admin portal, platform-wide)
  findAllAuditLogs: async (limit = 200) => {
    if (!process.env.SUPABASE_URL) return [];
    try {
      const res = await fetch(`${q('AuditLog')}?order=createdAt.desc&limit=${limit}`, { headers: headers() });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) return rows;
      }
    } catch (err) {
      console.error('Admin audit list failed:', err.message);
    }
    return [];
  },

  // Audit log
  insertAuditLog: async (record) => {
    if (!process.env.SUPABASE_URL) return null;
    try {
      const res = await fetch(q('AuditLog'), {
        method: 'POST',
        headers: { ...headers(), 'Prefer': 'return=representation' },
        body: JSON.stringify(record)
      });
      if (res.ok) {
        const rows = await res.json();
        return Array.isArray(rows) ? rows[0] : rows;
      }
    } catch (err) {
      console.error('Audit insert failed:', err.message);
    }
    return null;
  },

  findAuditLogsByUserId: async (userId, limit = 100) => {
    if (!process.env.SUPABASE_URL) return [];
    try {
      const res = await fetch(`${q('AuditLog')}?userId=eq.${encodeURIComponent(userId)}&order=createdAt.desc&limit=${limit}`, { headers: headers() });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) return rows;
      }
    } catch (err) {
      console.error('Audit list failed:', err.message);
    }
    return [];
  },

  // Products
  findProductsByUserId: async (userId) => {
    const res = await fetch(`${q('Product')}?userId=eq.${userId}&order=createdAt.desc`, { headers: headers() });
    return res.json();
  },

  findProductById: async (id, userId) => {
    const res = await fetch(`${q('Product')}?id=eq.${id}&userId=eq.${userId}&limit=1`, { headers: headers() });
    const rows = await res.json();
    return rows[0] || null;
  },

  findProductByIdPublic: async (id) => {
    const res = await fetch(`${q('Product')}?id=eq.${id}&limit=1`, { headers: headers() });
    const rows = await res.json();
    return rows[0] || null;
  },

  findProductsByUserIdPublic: async (userId) => {
    const res = await fetch(`${q('Product')}?userId=eq.${userId}&order=createdAt.desc`, { headers: headers() });
    return res.json();
  },

  createProduct: async (data) => {
    const res = await fetch(q('Product'), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    const rows = await res.json();
    return rows[0];
  },

  updateProduct: async (id, userId, data) => {
    const res = await fetch(`${q('Product')}?id=eq.${id}&userId=eq.${userId}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(data)
    });
    const rows = await res.json();
    return rows[0] || null;
  },

  deleteProduct: async (id, userId) => {
    const res = await fetch(`${q('Product')}?id=eq.${id}&userId=eq.${userId}`, {
      method: 'DELETE',
      headers: { ...headers(), 'Prefer': 'return=minimal' }
    });
    return res.ok;
  },

  // Payment Settings
  findPaymentByUserId: async (userId) => {
    const res = await fetch(`${q('PaymentSettings')}?userId=eq.${userId}&limit=1`, { headers: headers() });
    const rows = await res.json();
    return rows[0] || null;
  },

  upsertPayment: async (userId, data) => {
    const res = await fetch(q('PaymentSettings'), {
      method: 'POST',
      headers: { ...headers(), 'Prefer': 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify({ userId, ...data })
    });
    const rows = await res.json();
    return rows[0];
  },

  // -------------------------------------------------------------------------
  // Identifier sign-in (email OR mobile number)
  // -------------------------------------------------------------------------

  findUserByPhone: async (phone) => {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) return null;
    const rows = await request('a phone lookup', `${q('User')}?phone=eq.${encodeURIComponent(cleanPhone)}&limit=1`, { headers: headers() });
    return rows || null;
  },

  /** Resolve an email address or a mobile number to one account. */
  findUserByIdentifier: async (identifier) => {
    const parsed = normalizeIdentifier(identifier);
    if (!parsed) return null;
    if (parsed.kind === 'email') return db.findUserByEmail(parsed.value);
    return db.findUserByPhone(parsed.value);
  },

  /** Is this email/phone already taken? Used before provisioning an account. */
  findUserByEmailOrPhone: async (email, phone) => {
    const byEmail = email ? await db.findUserByEmail(email) : null;
    if (byEmail) return byEmail;
    const byPhone = phone ? await db.findUserByPhone(phone) : null;
    return byPhone || null;
  },

  // -------------------------------------------------------------------------
  // Connectivity diagnostics (GET /api/health)
  // -------------------------------------------------------------------------

  checkConnection: async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return { connected: false, configured: false, error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set' };
    }
    const startedAt = Date.now();
    try {
      const res = await fetch(`${q('User')}?select=id&limit=1`, {
        headers: headers(),
        signal: AbortSignal.timeout(5000)
      });
      const latencyMs = Date.now() - startedAt;
      if (res.ok) return { connected: true, configured: true, latencyMs };
      let detail = '';
      try {
        detail = (await res.text()).slice(0, 240);
      } catch {
        detail = 'no response body';
      }
      return { connected: false, configured: true, latencyMs, status: res.status, error: detail };
    } catch (err) {
      return { connected: false, configured: true, latencyMs: Date.now() - startedAt, error: err.message };
    }
  },

  // -------------------------------------------------------------------------
  // Access requests (invitation-only onboarding)
  // -------------------------------------------------------------------------

  createAccessRequest: async (data) => {
    return request('an access request', q('AccessRequest'), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: data.name,
        businessName: data.businessName || null,
        email: data.email ? String(data.email).toLowerCase() : null,
        phone: data.phone ? normalizePhone(data.phone) : null,
        city: data.city || null,
        category: data.category || null,
        message: data.message || null,
        source: data.source || 'website',
        status: 'pending',
        createdAt: new Date().toISOString()
      })
    });
  },

  findAccessRequests: async (status) => {
    const filter = status && status !== 'all' ? `&status=eq.${encodeURIComponent(status)}` : '';
    try {
      const res = await fetch(`${q('AccessRequest')}?order=createdAt.desc&limit=500${filter}`, {
        headers: headers(),
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) return [];
      const rows = await res.json();
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  },

  findAccessRequestById: async (id) => {
    const rows = await request('an access request lookup', `${q('AccessRequest')}?id=eq.${encodeURIComponent(id)}&limit=1`, { headers: headers() });
    return rows || null;
  },

  updateAccessRequest: async (id, data) => {
    return request('an access request update', `${q('AccessRequest')}?id=eq.${id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(data)
    });
  }
};

export default db;
