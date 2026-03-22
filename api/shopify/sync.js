// Shopify product sync
const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

export async function syncProductToShopify(product) {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    throw new Error('Shopify credentials not configured');
  }

  const shopifyProduct = {
    product: {
      title: product.name,
      body_html: product.description,
      vendor: 'Digital Catalog Agent',
      product_type: product.category,
      tags: [product.language, product.category],
      variants: [
        {
          price: product.price.toFixed(2),
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
    const err = await res.json();
    throw new Error(err.errors || 'Failed to sync to Shopify');
  }

  const data = await res.json();
  return data.product;
}

export async function updateProductInShopify(shopifyProductId, product) {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    throw new Error('Shopify credentials not configured');
  }

  if (!shopifyProductId) {
    throw new Error('Shopify product ID is required for updates');
  }

  const shopifyProduct = {
    product: {
      id: shopifyProductId,
      title: product.name,
      body_html: product.description,
      product_type: product.category,
      tags: [product.language, product.category],
      variants: [
        {
          price: product.price.toFixed(2),
          inventory_management: null,
          fulfillment_service: 'manual'
        }
      ]
    }
  };

  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products/${shopifyProductId}.json`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_TOKEN
    },
    body: JSON.stringify(shopifyProduct)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.errors || 'Failed to update product in Shopify');
  }

  const data = await res.json();
  return data.product;
}

export async function getShopifyProducts() {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    throw new Error('Shopify credentials not configured');
  }

  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products.json?limit=250`, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_TOKEN
    }
  });

  if (!res.ok) throw new Error('Failed to fetch Shopify products');
  const data = await res.json();
  return data.products;
}

// Handler for manual sync of all products
import { requireAuth } from '../_lib/auth.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    res.status(500).json({ error: error.message });
  }
}

export default requireAuth(handler);
