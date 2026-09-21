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
      ],
      ...(product.imageUrl && product.imageUrl.startsWith('http') ? { images: [{ src: product.imageUrl }] } : {})
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_TOKEN
    },
    body: JSON.stringify(shopifyProduct),
    signal: controller.signal
  });
  clearTimeout(timeout);

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

// Update existing Shopify product
export async function updateShopifyProduct(product) {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN || !product.shopifyUrl) {
    throw new Error('Product not synced to Shopify');
  }

  // Extract Shopify product ID from URL
  const handle = product.shopifyUrl.split('/products/')[1];
  if (!handle) throw new Error('Invalid Shopify URL');

  // Get Shopify product ID by handle
  const findRes = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products.json?handle=${handle}`, {
    headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN }
  });
  
  if (!findRes.ok) throw new Error('Product not found in Shopify');
  const findData = await findRes.json();
  if (!findData.products || findData.products.length === 0) {
    throw new Error('Product deleted from Shopify');
  }

  const shopifyId = findData.products[0].id;
  const variantId = findData.products[0].variants[0].id;

  // Update the product
  const shopifyProduct = {
    product: {
      id: shopifyId,
      title: product.name,
      body_html: product.description || '',
      vendor: product.sellerName || 'Digital Catalog Agent',
      product_type: product.category || '',
      tags: [product.language, product.category].filter(Boolean),
      variants: [
        {
          id: variantId,
          price: parseFloat(product.price).toFixed(2)
        }
      ],
      ...(product.imageUrl && product.imageUrl.startsWith('http') ? { images: [{ src: product.imageUrl }] } : {})
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products/${shopifyId}.json`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_TOKEN
    },
    body: JSON.stringify(shopifyProduct),
    signal: controller.signal
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = typeof err.errors === 'string' ? err.errors : JSON.stringify(err.errors || 'Failed to update Shopify product');
    throw new Error(msg);
  }

  return await res.json();
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

    // Only sync products without a shopifyUrl (not yet synced)
    const toSync = products
      .filter(p => !p.shopifyUrl)
      .map(p => ({ ...p, sellerName }));

    const skipped = products.length - toSync.length;

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
