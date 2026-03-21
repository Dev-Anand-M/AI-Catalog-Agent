import { getUserIdFromRequest } from '../_lib/auth.js';
import { getDb } from '../_lib/db.js';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

export async function syncProductToShopify(product) {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    throw new Error('Shopify credentials not configured');
  }

  const shopifyProduct = {
    product: {
      title: product.name,
      body_html: product.description || '',
      vendor: product.sellerName || 'Digital Catalog Agent',
      product_type: product.category || '',
      tags: [product.language, product.category].filter(Boolean),
      variants: [
        {
          price: parseFloat(product.price).toFixed(2),
          inventory_management: null,
          fulfillment_service: 'manual'
        }
      ]
    }
  };

  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_TOKEN
    },
    body: JSON.stringify(shopifyProduct)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err.errors === 'string' ? err.errors : JSON.stringify(err.errors || 'Failed to sync to Shopify');
    throw new Error(msg);
  }

  const data = await res.json();
  const shopifyUrl = `https://${SHOPIFY_DOMAIN}/products/${data.product.handle}`;

  // Save shopifyUrl back to the Product row
  if (product.id) {
    try {
      const sql = getDb();
      await sql`UPDATE "Product" SET "shopifyUrl" = ${shopifyUrl} WHERE id = ${product.id}`;
    } catch (e) {
      console.error('Failed to save shopifyUrl:', e.message);
    }
  }

  return { ...data.product, shopifyUrl };
}

// Fetch all Shopify product handles in one call
async function fetchAllShopifyHandles() {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products.json?limit=250&fields=id,handle`, {
    headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN }
  });
  if (!res.ok) return new Set();
  const data = await res.json();
  return new Set((data.products || []).map(p => p.handle));
}

// POST /api/shopify/sync — smart sync: skip existing, re-sync deleted
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { products } = req.body;
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Products array required' });
    }

    const sql = getDb();

    // Get seller name to use as Shopify vendor
    const userRows = await sql`SELECT name FROM "User" WHERE id = ${userId}`;
    const sellerName = userRows[0]?.name || 'Local Seller';

    // Tag each product with seller name
    const productsWithSeller = products.map(p => ({ ...p, sellerName }));

    // One API call to get all existing Shopify handles
    const shopifyHandles = await fetchAllShopifyHandles();

    const toSync = [];
    let skipped = 0;

    for (const p of productsWithSeller) {
      if (p.shopifyUrl) {
        const handle = p.shopifyUrl.split('/products/')[1];
        if (handle && shopifyHandles.has(handle)) {
          skipped++;
          continue;
        }
        await sql`UPDATE "Product" SET "shopifyUrl" = NULL WHERE id = ${p.id}`.catch(() => {});
        toSync.push({ ...p, shopifyUrl: null });
      } else {
        toSync.push(p);
      }
    }

    if (toSync.length === 0) {
      return res.json({ synced: 0, failed: 0, total: products.length, skipped });
    }

    const results = await Promise.allSettled(toSync.map(p => syncProductToShopify(p)));
    const synced = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({ synced, failed, total: products.length, skipped });
  } catch (error) {
    console.error('Shopify sync error:', error);
    res.status(500).json({ error: error.message || 'Sync failed' });
  }
}
