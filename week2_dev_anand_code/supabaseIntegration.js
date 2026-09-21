/**
 * Week 2 Implementation: Enhanced Supabase Database Persistence & Integration Module
 * Developer: Dev Anand (Tech Lead)
 * Assigned Task: AI Response Parsing & Supabase DB Integration
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fmswlefmbvdwexnhomwr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

// Persistent In-Memory Mirror Database (Prevents network offline crashes)
const mirrorStorage = {
  products: [
    {
      id: 101,
      userId: 1,
      name: 'Organic Assam Tea 500g',
      description: 'Handpicked fresh Assam black tea leaves.',
      category: 'Grocery',
      price: 299,
      suggestedPrice: 299,
      imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3',
      language: 'English',
      createdAt: new Date().toISOString()
    }
  ],
  sellers: []
};

/**
 * Low-level Supabase REST API Caller with Automatic Retries
 */
async function callSupabase(table, options = {}, retries = 2) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...options.headers
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { ...options, headers });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
        return true;
      }
    } catch (err) {
      if (attempt === retries) {
        console.warn(`Supabase ${table} HTTP call failed after ${retries} attempts:`, err.message);
      }
    }
  }
  return null;
}

/**
 * Persist AI Parsed Product to Database
 */
async function saveParsedProduct(userId, parsedProduct) {
  const record = {
    id: Date.now(),
    userId: userId || 1,
    name: parsedProduct.name,
    description: parsedProduct.description || '',
    category: parsedProduct.category || 'Grocery',
    suggestedPrice: parsedProduct.suggestedPrice || 0,
    price: parsedProduct.price || parsedProduct.suggestedPrice || 0,
    imageUrl: parsedProduct.imageUrl || null,
    language: parsedProduct.language || 'English',
    createdAt: new Date().toISOString()
  };

  // Try cloud storage first
  const cloudData = await callSupabase('Product', {
    method: 'POST',
    body: JSON.stringify([record])
  });

  if (cloudData && cloudData.length > 0) {
    return { ...cloudData[0], storage: 'supabase-cloud' };
  }

  // Fallback to local mirror storage
  mirrorStorage.products.push(record);
  return { ...record, storage: 'local-mirror' };
}

/**
 * Fetch Catalog Products for Seller
 */
async function fetchSellerCatalog(userId) {
  const cloudData = await callSupabase(`Product?userId=eq.${userId}&select=*&order=createdAt.desc`);
  if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
    return cloudData;
  }
  return mirrorStorage.products.filter(p => p.userId == userId);
}

/**
 * Bulk Upsert Products
 */
async function bulkUpsertProducts(userId, productsList) {
  const results = [];
  for (const item of productsList) {
    const saved = await saveParsedProduct(userId, item);
    results.push(saved);
  }
  return results;
}

module.exports = {
  saveParsedProduct,
  fetchSellerCatalog,
  bulkUpsertProducts,
  mirrorStorage
};
