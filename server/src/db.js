// Supabase REST Database Driver with Seamless Local Fallback for Express Server
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { normalizePhone, normalizeIdentifier } = require('./lib/identifier');

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

// ---------------------------------------------------------------------------
// Failure visibility
//
// Every Supabase call falls back to a local JSON file so the app stays usable
// offline. That fallback used to be completely silent, which made "the database
// is unreachable" indistinguishable from "the feature is broken". Warnings are
// throttled per distinct failure so logs stay readable.
// ---------------------------------------------------------------------------

let lastFallbackKey = '';

function warnFallback(operation, error) {
  const message = (error && error.message) || String(error);
  const key = `${operation}|${message}`;
  if (key === lastFallbackKey) return;
  lastFallbackKey = key;
  console.warn(
    `[db] Supabase request failed during ${operation} (${message}). ` +
    'Using the local JSON fallback — anything written now will NOT reach Supabase. ' +
    'Check SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY and GET /api/health.'
  );
}

/** Log a non-2xx response that would otherwise be swallowed by the fallback. */
async function warnResponse(operation, res) {
  let detail = '';
  try {
    detail = (await res.text()).slice(0, 200);
  } catch {
    detail = 'no response body';
  }
  warnFallback(operation, new Error(`HTTP ${res.status} ${detail}`));
}

/**
 * Perform a Supabase write. Throws on any non-2xx so a schema/constraint rejection is
 * never mistaken for success (silently writing to the local file would make the user
 * "exist" locally while being absent from Supabase).
 */
async function supabaseWrite(label, url, init) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 220);
    } catch {
      detail = '';
    }
    const error = new Error(`Supabase rejected ${label} (HTTP ${res.status}): ${detail || 'no response body'}`);
    error.httpStatus = res.status;
    throw error;
  }
  const rows = await res.json().catch(() => null);
  return Array.isArray(rows) ? rows[0] : rows;
}

// Local JSON store for resilient local development & offline fallback
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');

const INITIAL_DB = {
  users: [
    {
      id: 'demo-artisan-1',
      name: 'Ramesh Kumar (कारीगर)',
      email: 'demo@store.com',
      phone: '+919876543210',
      isActive: true,
      role: 'user',
      language: null,
      passwordHash: '$2b$10$G6NXb9ORrDuh47j0wwYO0eu8boGg2hmjiLqzC7RXNNb/ix8oXqgkK' // password123
    },
    {
      id: 'demo-artisan-2',
      name: 'Lakshmi Weaves (हथकरघा)',
      email: 'artisan@store.com',
      phone: '+919812345678',
      isActive: true,
      role: 'user',
      language: null,
      passwordHash: '$2b$10$G6NXb9ORrDuh47j0wwYO0eu8boGg2hmjiLqzC7RXNNb/ix8oXqgkK' // password123
    }
  ],
  products: [
    {
      id: 'prod-1',
      userId: 'demo-artisan-1',
      name: 'Terracotta Chai Kulhad (Set of 6)',
      description: 'Handmade clay tea cups with natural earthy aroma. Eco-friendly and washable. <!--META:{\"confirmationState\":\"seller_confirmed\",\"costBreakdown\":{\"rawMaterials\":50,\"labor\":60,\"packaging\":20,\"marginPercent\":30},\"attributes\":{\"craft\":\"Mitti / Pottery\",\"material\":\"Clay\"},\"tags\":[\"Clay\",\"Chai\",\"Handmade\"],\"media\":[],\"language\":\"en\",\"status\":\"active\"}-->',
      price: 170,
      category: 'Handicrafts',
      imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
      language: 'en',
      createdAt: '2026-03-01T10:00:00.000Z'
    },
    {
      id: 'prod-2',
      userId: 'demo-artisan-1',
      name: 'Pure Khadi Handloom Cotton Kurta',
      description: 'Comfortable handspun khadi kurta dyed with traditional indigo colors. <!--META:{\"confirmationState\":\"seller_confirmed\",\"costBreakdown\":{\"rawMaterials\":350,\"labor\":250,\"packaging\":40,\"marginPercent\":35},\"attributes\":{\"fabric\":\"100% Khadi\",\"weave\":\"Handloom\"},\"tags\":[\"Khadi\",\"Kurta\",\"Handloom\"],\"media\":[],\"language\":\"en\",\"status\":\"active\"}-->',
      price: 860,
      category: 'Clothing',
      imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80',
      language: 'en',
      createdAt: '2026-03-02T11:30:00.000Z'
    },
    {
      id: 'prod-3',
      userId: 'demo-artisan-1',
      name: 'Hand-Carved Sheesham Wooden Bowl',
      description: 'Traditional carved wooden bowl polished with organic beeswax for food safety. <!--META:{\"confirmationState\":\"ai_suggested\",\"costBreakdown\":{\"rawMaterials\":180,\"labor\":150,\"packaging\":30,\"marginPercent\":30},\"attributes\":{\"wood\":\"Sheesham\",\"finish\":\"Organic Wax\"},\"tags\":[\"Wood\",\"Carved\",\"Kitchen\"],\"media\":[],\"language\":\"en\",\"status\":\"active\"}-->',
      price: 470,
      category: 'Home & Kitchen',
      imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=600&q=80',
      language: 'en',
      createdAt: '2026-03-03T14:00:00.000Z'
    }
  ],
  payment: {
    'demo-artisan-1': {
      id: 'pay-1',
      userId: 'demo-artisan-1',
      upiData: [{ id: 1, upiId: 'ramesh.artisan@upi', name: 'Ramesh Kumar' }],
      bankAccount: { accountName: 'Ramesh Kumar', accountNumber: '912345678901', ifsc: 'SBIN0001234', bankName: 'State Bank of India' },
      phoneNumber: '+919876543210'
    }
  },
  accessRequests: []
};

// Older local_db.json files predate newer collections — normalise on every read so a
// stale file can never crash a request with "cannot read property of undefined".
function withDefaults(data) {
  const source = data && typeof data === 'object' ? data : {};
  return {
    ...source,
    users: Array.isArray(source.users) ? source.users : [],
    products: Array.isArray(source.products) ? source.products : [],
    payment: source.payment && typeof source.payment === 'object' ? source.payment : {},
    accessRequests: Array.isArray(source.accessRequests) ? source.accessRequests : []
  };
}

let memDb = null;

function readLocalDb() {
  if (isTestEnv) {
    if (!memDb) {
      memDb = JSON.parse(JSON.stringify(INITIAL_DB));
    }
    return withDefaults(memDb);
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2));
      return withDefaults(JSON.parse(JSON.stringify(INITIAL_DB)));
    }
    return withDefaults(JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')));
  } catch (err) {
    console.error('Error reading local db:', err);
    return withDefaults(JSON.parse(JSON.stringify(INITIAL_DB)));
  }
}

function writeLocalDb(data) {
  if (isTestEnv) {
    memDb = data;
    return;
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing local db:', err);
  }
}

const db = {
  // Users
  findUserByEmail: async (email) => {
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!isTestEnv) {
      try {
        const res = await fetch(`${q('User')}?email=eq.${encodeURIComponent(cleanEmail)}&limit=1`, { 
          headers: headers(),
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows[0]) return rows[0];
        } else {
          await warnResponse('findUserByEmail', res);
        }
      } catch (err) {
        warnFallback('findUserByEmail', err);
      }
    }

    const local = readLocalDb();
    const user = local.users.find(u => (u.email || '').toLowerCase() === cleanEmail);
    return user || null;
  },

  /** Look a merchant up by mobile number (stored in E.164 form). */
  findUserByPhone: async (phone) => {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) return null;

    if (!isTestEnv) {
      try {
        const res = await fetch(`${q('User')}?phone=eq.${encodeURIComponent(cleanPhone)}&limit=1`, {
          headers: headers(),
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows[0]) return rows[0];
        } else {
          await warnResponse('findUserByPhone', res);
        }
      } catch (err) {
        warnFallback('findUserByPhone', err);
      }
    }

    const local = readLocalDb();
    return local.users.find(u => u.phone === cleanPhone) || null;
  },

  /**
   * Resolve a sign-in identifier that may be an email address OR a mobile number.
   * Returns the matched user, or null when the identifier is unusable (the caller
   * reports that as invalid credentials rather than leaking which field was wrong).
   */
  findUserByIdentifier: async (identifier) => {
    const parsed = normalizeIdentifier(identifier);
    if (!parsed) return null;
    if (parsed.kind === 'email') return db.findUserByEmail(parsed.value);
    return db.findUserByPhone(parsed.value);
  },

  /** Whether a user row already owns this email or phone number. */
  findUserByEmailOrPhone: async (email, phone) => {
    const byEmail = email ? await db.findUserByEmail(email) : null;
    if (byEmail) return byEmail;
    const byPhone = phone ? await db.findUserByPhone(phone) : null;
    return byPhone || null;
  },

  findUserById: async (id) => {
    if (!isTestEnv) {
      try {
        const res = await fetch(`${q('User')}?id=eq.${id}&limit=1`, { 
          headers: headers(),
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows[0]) return rows[0];
        } else {
          await warnResponse('findUserById', res);
        }
      } catch (err) {
        warnFallback('findUserById', err);
      }
    }

    const local = readLocalDb();
    const user = local.users.find(u => String(u.id) === String(id));
    return user || null;
  },

  createUser: async (data) => {
    const cleanEmail = (data.email || '').toLowerCase().trim();
    const cleanPhone = data.phone ? normalizePhone(data.phone) : null;

    if (!isTestEnv) {
      try {
        const user = await supabaseWrite('a new user account', q('User'), {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ ...data, email: cleanEmail || null, phone: cleanPhone })
        });
        if (user && user.id) return user;
        throw new Error('Supabase accepted the insert but returned no user row');
      } catch (err) {
        // A schema/constraint rejection must reach the caller. Falling back here would
        // "create" the merchant in a local file while they stay absent from Supabase.
        if (err.httpStatus) throw err;
        warnFallback('createUser', err);
      }
    }

    const local = readLocalDb();
    const newUser = {
      id: data.id || `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: data.name,
      email: cleanEmail || null,
      phone: cleanPhone,
      role: data.role || 'user',
      isActive: data.isActive !== false,
      language: data.language || null,
      mustChangePassword: !!data.mustChangePassword,
      passwordHash: data.passwordHash,
      createdAt: new Date().toISOString()
    };
    local.users.push(newUser);
    writeLocalDb(local);
    return newUser;
  },

  updateUser: async (id, data) => {
    const payload = { ...(data || {}) };
    if ('phone' in payload) payload.phone = payload.phone ? normalizePhone(payload.phone) : null;
    if ('email' in payload) payload.email = payload.email ? String(payload.email).toLowerCase().trim() : null;

    if (!isTestEnv && Object.keys(payload).length > 0) {
      try {
        const user = await supabaseWrite('a user update', `${q('User')}?id=eq.${id}`, {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify(payload)
        });
        if (user && user.id) return user;
      } catch (err) {
        if (err.httpStatus) throw err;
        warnFallback('updateUser', err);
      }
    }

    const local = readLocalDb();
    const idx = local.users.findIndex(u => String(u.id) === String(id));
    if (idx !== -1) {
      local.users[idx] = { ...local.users[idx], ...payload, updatedAt: new Date().toISOString() };
      writeLocalDb(local);
      return local.users[idx];
    }
    return null;
  },

  // All users (admin portal)
  findAllUsers: async () => {
    if (!isTestEnv) {
      try {
        const res = await fetch(`${q('User')}?order=createdAt.desc&limit=1000`, {
          headers: headers(),
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows)) return rows;
        }
      } catch (err) {
        warnFallback('a Supabase request', err);
      }
    }
    const local = readLocalDb();
    return local.users;
  },

  deleteUser: async (id) => {
    if (!isTestEnv) {
      try {
        await fetch(`${q('User')}?id=eq.${id}`, {
          method: 'DELETE',
          headers: headers(),
          signal: AbortSignal.timeout(3000)
        });
        await fetch(`${q('Product')}?userId=eq.${id}`, {
          method: 'DELETE',
          headers: headers(),
          signal: AbortSignal.timeout(3000)
        });
      } catch (err) {
        warnFallback('a Supabase request', err);
      }
    }

    const local = readLocalDb();
    const index = local.users.findIndex(u => String(u.id) === String(id));
    let deletedUser = null;
    if (index !== -1) {
      deletedUser = local.users.splice(index, 1)[0];
    }
    local.products = local.products.filter(p => String(p.userId) !== String(id));
    writeLocalDb(local);
    return deletedUser || { id };
  },

  // SAFETY: bulk deletes only ever run in a test environment.
  // An unguarded bulk delete against production wiped the database once — never again.
  deleteManyUsers: async () => {
    if (!isTestEnv) {
      console.error('[SAFETY GUARD] deleteManyUsers blocked outside test environment.');
      return { count: 0, blocked: true };
    }
    const local = readLocalDb();
    local.users = INITIAL_DB.users.map(u => ({ ...u }));
    writeLocalDb(local);
    return { count: local.users.length };
  },

  deleteManyProducts: async () => {
    if (!isTestEnv) {
      console.error('[SAFETY GUARD] deleteManyProducts blocked outside test environment.');
      return { count: 0, blocked: true };
    }
    const local = readLocalDb();
    local.products = [];
    writeLocalDb(local);
    return { count: 0 };
  },

  // Products
  findAllProducts: async () => {
    if (!isTestEnv) {
      try {
        const res = await fetch(`${q('Product')}?order=createdAt.desc`, { 
          headers: headers(),
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows)) return rows;
        }
      } catch (err) {
        warnFallback('a Supabase request', err);
      }
    }

    const local = readLocalDb();
    return local.products;
  },

  findProductsByUserId: async (userId) => {
    if (!isTestEnv) {
      try {
        const res = await fetch(`${q('Product')}?userId=eq.${userId}&order=createdAt.desc`, { 
          headers: headers(),
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows)) return rows;
        }
      } catch (err) {
        warnFallback('a Supabase request', err);
      }
    }

    const local = readLocalDb();
    return local.products.filter(p => String(p.userId) === String(userId));
  },

  findProductById: async (id, userId) => {
    if (!isTestEnv) {
      try {
        const url = userId 
          ? `${q('Product')}?id=eq.${id}&userId=eq.${userId}&limit=1`
          : `${q('Product')}?id=eq.${id}&limit=1`;
        const res = await fetch(url, { 
          headers: headers(),
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows[0]) return rows[0];
        }
      } catch (err) {
        warnFallback('a Supabase request', err);
      }
    }

    const local = readLocalDb();
    const product = local.products.find(p => {
      const idMatch = String(p.id) === String(id);
      return userId ? (idMatch && String(p.userId) === String(userId)) : idMatch;
    });
    return product || null;
  },

  createProduct: async (data) => {
    if (!isTestEnv) {
      try {
        const res = await fetch(q('Product'), {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const rows = await res.json();
          return Array.isArray(rows) ? rows[0] : rows;
        }
      } catch (err) {
        warnFallback('a Supabase request', err);
      }
    }

    const local = readLocalDb();
    const newProduct = {
      id: data.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: data.userId,
      name: data.name,
      description: data.description,
      price: Number(data.price) || 0,
      category: data.category || 'Handicrafts',
      imageUrl: data.imageUrl || '',
      language: data.language || 'en',
      createdAt: new Date().toISOString()
    };
    local.products.unshift(newProduct);
    writeLocalDb(local);
    return newProduct;
  },

  updateProduct: async (id, userId, data) => {
    const updatePayload = typeof userId === 'object' && !data ? userId : data;
    const actualUserId = typeof userId === 'string' ? userId : null;

    if (!isTestEnv) {
      try {
        const url = actualUserId 
          ? `${q('Product')}?id=eq.${id}&userId=eq.${actualUserId}`
          : `${q('Product')}?id=eq.${id}`;
        const res = await fetch(url, {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify(updatePayload),
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const rows = await res.json();
          return Array.isArray(rows) ? rows[0] : rows;
        }
      } catch (err) {
        warnFallback('a Supabase request', err);
      }
    }

    const local = readLocalDb();
    const index = local.products.findIndex(p => {
      const idMatch = String(p.id) === String(id);
      return actualUserId ? (idMatch && String(p.userId) === String(actualUserId)) : idMatch;
    });

    if (index === -1) return null;
    local.products[index] = {
      ...local.products[index],
      ...updatePayload,
      updatedAt: new Date().toISOString()
    };
    writeLocalDb(local);
    return local.products[index];
  },

  deleteProduct: async (id, userId) => {
    if (!isTestEnv) {
      try {
        const url = userId 
          ? `${q('Product')}?id=eq.${id}&userId=eq.${userId}`
          : `${q('Product')}?id=eq.${id}`;
        const res = await fetch(url, {
          method: 'DELETE',
          headers: headers(),
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) return { id };
      } catch (err) {
        warnFallback('a Supabase request', err);
      }
    }

    const local = readLocalDb();
    const index = local.products.findIndex(p => {
      const idMatch = String(p.id) === String(id);
      return userId ? (idMatch && String(p.userId) === String(userId)) : idMatch;
    });

    if (index === -1) return null;
    const deleted = local.products.splice(index, 1)[0];
    writeLocalDb(local);
    return deleted;
  },

  // Payment Settings
  findPaymentByUserId: async (userId) => {
    if (!isTestEnv) {
      try {
        const res = await fetch(`${q('PaymentSettings')}?userId=eq.${userId}&limit=1`, { 
          headers: headers(),
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows[0]) return rows[0];
        }
      } catch (err) {
        warnFallback('a Supabase request', err);
      }
    }

    const local = readLocalDb();
    return local.payment[userId] || local.payment['demo-artisan-1'] || null;
  },

  upsertPayment: async (userId, data) => {
    if (!isTestEnv) {
      try {
        const res = await fetch(q('PaymentSettings'), {
          method: 'POST',
          headers: { ...headers(), 'Prefer': 'return=representation,resolution=merge-duplicates' },
          body: JSON.stringify({ userId, ...data }),
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const rows = await res.json();
          return Array.isArray(rows) ? rows[0] : rows;
        }
      } catch (err) {
        warnFallback('a Supabase request', err);
      }
    }

    const local = readLocalDb();
    local.payment[userId] = {
      userId,
      ...data,
      updatedAt: new Date().toISOString()
    };
    writeLocalDb(local);
    return local.payment[userId];
  },

  // -------------------------------------------------------------------------
  // Connectivity diagnostics
  // -------------------------------------------------------------------------

  /**
   * Is the database actually reachable? Reported by GET /api/health so a stalled
   * connection is diagnosed in one request instead of guessed at.
   */
  checkConnection: async () => {
    const configured = Boolean(SUPABASE_URL && SUPABASE_KEY);
    if (!configured) {
      return {
        connected: false,
        configured: false,
        error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set'
      };
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
      return {
        connected: false,
        configured: true,
        latencyMs: Date.now() - startedAt,
        error: err.message
      };
    }
  },

  // -------------------------------------------------------------------------
  // Access requests (invitation-only onboarding)
  // -------------------------------------------------------------------------

  createAccessRequest: async (data) => {
    const payload = {
      name: String(data.name || '').trim(),
      businessName: data.businessName ? String(data.businessName).trim() : null,
      email: data.email ? String(data.email).toLowerCase().trim() : null,
      phone: data.phone ? normalizePhone(data.phone) : null,
      city: data.city ? String(data.city).trim() : null,
      category: data.category ? String(data.category).trim() : null,
      message: data.message ? String(data.message).trim().slice(0, 2000) : null,
      source: data.source || 'website',
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (!isTestEnv) {
      try {
        const created = await supabaseWrite('an access request', q('AccessRequest'), {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(payload)
        });
        if (created && created.id) return created;
        throw new Error('Supabase accepted the access request but returned no row');
      } catch (err) {
        // This used to rethrow, so a missing "AccessRequest" table (PGRST205) came
        // back to the visitor as a 503 and the lead was lost with no record of who
        // they were. The read path already degrades to the local store; the write
        // path now matches it, and says loudly why it had to. Run
        // supabase_enterprise_auth.sql to create the table for real.
        warnFallback('createAccessRequest', err);
      }
    }

    const local = readLocalDb();
    const stored = { id: `req-${Date.now()}`, ...payload };
    local.accessRequests.unshift(stored);
    writeLocalDb(local);
    return stored;
  },

  findAccessRequests: async (status) => {
    if (!isTestEnv) {
      try {
        const filter = status && status !== 'all' ? `&status=eq.${encodeURIComponent(status)}` : '';
        const res = await fetch(`${q('AccessRequest')}?order=createdAt.desc&limit=500${filter}`, {
          headers: headers(),
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows)) return rows;
        } else {
          await warnResponse('findAccessRequests', res);
        }
      } catch (err) {
        warnFallback('findAccessRequests', err);
      }
    }

    const local = readLocalDb();
    return local.accessRequests.filter(r => !status || status === 'all' || r.status === status);
  },

  findAccessRequestById: async (id) => {
    if (!isTestEnv) {
      try {
        const res = await fetch(`${q('AccessRequest')}?id=eq.${encodeURIComponent(id)}&limit=1`, {
          headers: headers(),
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows) && rows[0]) return rows[0];
        } else {
          await warnResponse('findAccessRequestById', res);
        }
      } catch (err) {
        warnFallback('findAccessRequestById', err);
      }
    }

    const local = readLocalDb();
    return local.accessRequests.find(r => String(r.id) === String(id)) || null;
  },

  updateAccessRequest: async (id, data) => {
    if (!isTestEnv) {
      try {
        const updated = await supabaseWrite('an access request update', `${q('AccessRequest')}?id=eq.${id}`, {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify(data)
        });
        if (updated && updated.id) return updated;
      } catch (err) {
        // Approving or declining must not fail just because the remote table is
        // absent — the row being updated lives in the same fallback store the
        // lookup just read from.
        warnFallback('updateAccessRequest', err);
      }
    }

    const local = readLocalDb();
    const idx = local.accessRequests.findIndex(r => String(r.id) === String(id));
    if (idx === -1) return null;
    local.accessRequests[idx] = { ...local.accessRequests[idx], ...data };
    writeLocalDb(local);
    return local.accessRequests[idx];
  }
};

module.exports = db;
