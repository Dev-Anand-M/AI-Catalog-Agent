// Database connection using Supabase REST API
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const headers = () => ({
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'return=representation'
});

const q = (table) => `${SUPABASE_URL}/rest/v1/${table}`;

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
  }
};

export default db;
