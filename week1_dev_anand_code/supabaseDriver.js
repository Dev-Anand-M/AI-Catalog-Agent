/**
 * Week 1 Implementation: Lightweight Supabase REST API Database Driver
 * Developer: Dev Anand (Tech Lead)
 * Assigned Task: Voice Input & API Routes Setup
 * 
 * Objective: Replace Prisma ORM binary overhead with pure HTTP REST calls to Supabase.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fmswlefmbvdwexnhomwr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

// In-Memory store fallback if Supabase is offline
const memoryDb = {
  users: [],
  products: []
};

/**
 * Universal Supabase REST fetch helper
 */
async function supabaseFetch(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase REST Error ${response.status}: ${text}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return null;
}

// Driver API Export
module.exports = {
  // User Management
  findUserByEmail: async (email) => {
    try {
      const data = await supabaseFetch(`User?email=eq.${encodeURIComponent(email)}&select=*`);
      if (data && data.length > 0) return data[0];
    } catch (e) {
      console.warn('Supabase fetch user failed, fallback to memory:', e.message);
    }
    return memoryDb.users.find(u => u.email === email) || null;
  },

  createUser: async (userData) => {
    const newUser = {
      id: Date.now(),
      name: userData.name,
      email: userData.email,
      password: userData.password,
      createdAt: new Date().toISOString()
    };
    try {
      const data = await supabaseFetch('User', {
        method: 'POST',
        body: JSON.stringify([newUser])
      });
      if (data && data.length > 0) return data[0];
    } catch (e) {
      console.warn('Supabase insert user failed, saved to memory:', e.message);
    }
    memoryDb.users.push(newUser);
    return newUser;
  },

  findUserById: async (id) => {
    try {
      const data = await supabaseFetch(`User?id=eq.${id}&select=*`);
      if (data && data.length > 0) return data[0];
    } catch (e) {
      console.warn('Supabase fetch user by ID failed:', e.message);
    }
    return memoryDb.users.find(u => u.id == id) || null;
  },

  // Product Management
  findProductsByUserId: async (userId) => {
    try {
      const data = await supabaseFetch(`Product?userId=eq.${userId}&select=*&order=createdAt.desc`);
      if (data) return data;
    } catch (e) {
      console.warn('Supabase fetch products failed, using memory:', e.message);
    }
    return memoryDb.products.filter(p => p.userId == userId);
  },

  createProduct: async (productData) => {
    const newProduct = {
      id: Date.now(),
      userId: productData.userId,
      name: productData.name,
      description: productData.description || '',
      category: productData.category || 'Other',
      suggestedPrice: productData.suggestedPrice || 0,
      price: productData.price || productData.suggestedPrice || 0,
      imageUrl: productData.imageUrl || null,
      language: productData.language || 'English',
      createdAt: new Date().toISOString()
    };

    try {
      const data = await supabaseFetch('Product', {
        method: 'POST',
        body: JSON.stringify([newProduct])
      });
      if (data && data.length > 0) return data[0];
    } catch (e) {
      console.warn('Supabase insert product failed, saved to memory:', e.message);
    }
    memoryDb.products.push(newProduct);
    return newProduct;
  },

  findProductById: async (id) => {
    try {
      const data = await supabaseFetch(`Product?id=eq.${id}&select=*`);
      if (data && data.length > 0) return data[0];
    } catch (e) {
      console.warn('Supabase fetch product failed:', e.message);
    }
    return memoryDb.products.find(p => p.id == id) || null;
  },

  updateProduct: async (id, updateData) => {
    try {
      const data = await supabaseFetch(`Product?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });
      if (data && data.length > 0) return data[0];
    } catch (e) {
      console.warn('Supabase update product failed:', e.message);
    }
    const idx = memoryDb.products.findIndex(p => p.id == id);
    if (idx !== -1) {
      memoryDb.products[idx] = { ...memoryDb.products[idx], ...updateData };
      return memoryDb.products[idx];
    }
    return null;
  },

  deleteProduct: async (id) => {
    try {
      await supabaseFetch(`Product?id=eq.${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Supabase delete product failed:', e.message);
    }
    memoryDb.products = memoryDb.products.filter(p => p.id != id);
    return true;
  }
};
