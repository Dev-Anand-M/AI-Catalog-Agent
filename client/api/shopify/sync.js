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

    const results = await Promise.allSettled(
      products.map(p => syncProductToShopify(p))
    );

    const synced = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({ synced, failed, total: products.length });
  } catch (error) {
    console.error('Shopify sync error:', error);
    res.status(500).json({ error: error.message || 'Sync failed' });
  }
}
