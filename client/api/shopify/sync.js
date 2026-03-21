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
      vendor: 'Digital Catalog Agent',
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

// Check if a Shopify product still exists by its handle (extracted from URL)
async function shopifyProductExists(shopifyUrl) {
  try {
    const handle = shopifyUrl.split('/products/')[1];
    if (!handle) return false;
    const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products.json?handle=${handle}`, {
      headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN }
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.products && data.products.length > 0;
  } catch {
    return false;
  }
}

// POST /api/shopify/sync — bulk sync products array
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

    // For products with a shopifyUrl, verify they still exist in Shopify
    // If deleted from Shopify, clear the URL so they get re-synced
    const verified = await Promise.all(
      products.map(async p => {
        if (!p.shopifyUrl) return p;
        const exists = await shopifyProductExists(p.shopifyUrl);
        if (!exists) {
          // Clear stale shopifyUrl from DB
          try {
            const sql = getDb();
            await sql`UPDATE "Product" SET "shopifyUrl" = NULL WHERE id = ${p.id}`;
          } catch (e) {
            console.error('Failed to clear stale shopifyUrl:', e.message);
          }
          return { ...p, shopifyUrl: null };
        }
        return p;
      })
    );

    const toSync = verified.filter(p => !p.shopifyUrl);
    const skipped = verified.length - toSync.length;

    if (toSync.length === 0) {
      return res.json({ synced: 0, failed: 0, total: products.length, skipped });
    }

    const results = await Promise.allSettled(
      toSync.map(p => syncProductToShopify(p))
    );

    const synced = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({ synced, failed, total: products.length, skipped });
  } catch (error) {
    console.error('Shopify sync error:', error);
    res.status(500).json({ error: error.message || 'Sync failed' });
  }
}
