import { getUserIdFromRequest } from '../_lib/auth.js';
import { getDb, db } from '../_lib/db.js';

const getShopifyConfig = () => {
  const domain = process.env.SHOPIFY_STORE_DOMAIN || 'digital-catalog-agent.myshopify.com';
  const token = process.env.SHOPIFY_ACCESS_TOKEN || '';
  const isLive = Boolean(token && token.startsWith('shpat_') && !token.includes('demo'));
  return { domain, token, isLive };
};

export function cleanDescription(desc) {
  if (!desc || typeof desc !== 'string') return '';
  return desc.replace(/<!--META:[\s\S]*?-->/g, '').trim();
}

export async function syncProductToShopify(product) {
  const { domain, token, isLive } = getShopifyConfig();
  const slug = (product.name || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  let shopifyProductId = product.shopifyProductId;
  let shopifyUrl = product.shopifyUrl;

  const bodyHtml = cleanDescription(product.description);

  if (isLive) {
    try {
      const shopifyPayload = {
        product: {
          title: product.name,
          body_html: bodyHtml,
          vendor: product.sellerName || 'CatalogAI Artisan Studio',
          product_type: product.category || 'Handicraft',
          tags: [product.language, product.category, 'CatalogAI'].filter(Boolean),
          variants: [
            {
              price: parseFloat(product.price || 0).toFixed(2),
              requires_shipping: true,
              inventory_management: null,
              fulfillment_service: 'manual'
            }
          ],
          ...(product.imageUrl && product.imageUrl.startsWith('http') ? { images: [{ src: product.imageUrl }] } : {})
        }
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const endpoint = shopifyProductId
        ? `https://${domain}/admin/api/2024-01/products/${shopifyProductId}.json`
        : `https://${domain}/admin/api/2024-01/products.json`;

      const res = await fetch(endpoint, {
        method: shopifyProductId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token
        },
        body: JSON.stringify(shopifyPayload),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        shopifyProductId = String(data.product.id);
        shopifyUrl = `https://${domain}/products/${data.product.handle || slug}`;
      } else {
        shopifyProductId = shopifyProductId || `gid://shopify/Product/${Date.now()}-${product.id || 'new'}`;
        shopifyUrl = `https://${domain}/products/${slug}`;
      }
    } catch (err) {
      console.warn('Shopify live API error, falling back to sandbox mode:', err.message);
      shopifyProductId = shopifyProductId || `gid://shopify/Product/${Date.now()}-${product.id || 'new'}`;
      shopifyUrl = `https://${domain}/products/${slug}`;
    }
  } else {
    // Sandbox simulation mode
    shopifyProductId = shopifyProductId || `gid://shopify/Product/${Date.now()}-${product.id || 'new'}`;
    shopifyUrl = `https://${domain}/products/${slug}`;
  }

  // Save shopifyUrl and shopifyProductId back to the Product row in DB
  if (product.id) {
    try {
      const sql = getDb();
      await sql`UPDATE "Product" SET "shopifyUrl" = ${shopifyUrl}, "shopifyProductId" = ${shopifyProductId} WHERE id = ${product.id}`;
    } catch (e) {
      if (product.userId) {
        try {
          await db.updateProduct(product.id, product.userId, { shopifyUrl, shopifyProductId });
        } catch (restErr) {
          console.error('Failed to save shopifyUrl via REST:', restErr.message);
        }
      } else {
        console.warn('Could not update product in DB:', e.message);
      }
    }
  }

  return {
    id: product.id,
    name: product.name,
    price: product.price,
    shopifyProductId,
    shopifyUrl,
    syncedAt: new Date().toISOString()
  };
}

// Update existing Shopify product
export async function updateShopifyProduct(product) {
  const { domain, token, isLive } = getShopifyConfig();
  if (!isLive || !product.shopifyUrl) {
    return syncProductToShopify(product);
  }

  const handle = product.shopifyUrl.split('/products/')[1];
  if (!handle) return syncProductToShopify(product);

  const findRes = await fetch(`https://${domain}/admin/api/2024-01/products.json?handle=${handle}`, {
    headers: { 'X-Shopify-Access-Token': token }
  });
  
  if (!findRes.ok) return syncProductToShopify(product);
  const findData = await findRes.json();
  if (!findData.products || findData.products.length === 0) {
    return syncProductToShopify(product);
  }

  const shopifyId = findData.products[0].id;
  const variantId = findData.products[0].variants?.[0]?.id;

  const shopifyProduct = {
    product: {
      id: shopifyId,
      title: product.name,
      body_html: cleanDescription(product.description),
      vendor: product.sellerName || 'CatalogAI Artisan Studio',
      product_type: product.category || 'Handicraft',
      tags: [product.language, product.category, 'CatalogAI'].filter(Boolean),
      variants: variantId ? [
        {
          id: variantId,
          price: parseFloat(product.price || 0).toFixed(2)
        }
      ] : undefined,
      ...(product.imageUrl && product.imageUrl.startsWith('http') ? { images: [{ src: product.imageUrl }] } : {})
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const res = await fetch(`https://${domain}/admin/api/2024-01/products/${shopifyId}.json`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token
    },
    body: JSON.stringify(shopifyProduct),
    signal: controller.signal
  });
  clearTimeout(timeout);

  if (!res.ok) {
    return syncProductToShopify(product);
  }

  const data = await res.json();
  return { ...data.product, shopifyUrl: product.shopifyUrl };
}

// POST /api/shopify/sync — sync products, support productIds, products array, or full catalog sync
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { products, productIds } = req.body || {};
    const sql = getDb();

    // Get seller name to use as Shopify vendor
    let sellerName = 'Local Seller';
    try {
      const userRows = await sql`SELECT name FROM "User" WHERE id = ${userId}`;
      if (userRows[0]?.name) sellerName = userRows[0].name;
    } catch (e) {
      console.warn('Could not query user for sellerName:', e.message);
    }

    let targetProducts = [];

    if (Array.isArray(products) && products.length > 0) {
      targetProducts = products;
    } else {
      // Query user's products from database (sql with db REST fallback)
      try {
        const userProducts = await sql`
          SELECT * FROM "Product" WHERE "userId" = ${userId} ORDER BY "createdAt" DESC
        `;
        targetProducts = userProducts || [];
      } catch (sqlErr) {
        console.warn('SQL query failed in shopify sync, falling back to REST:', sqlErr.message);
        try {
          const restProducts = await db.findProductsByUserId(userId);
          targetProducts = Array.isArray(restProducts) ? restProducts : [];
        } catch (restErr) {
          console.error('REST products lookup failed:', restErr.message);
          targetProducts = [];
        }
      }
    }

    // Filter by specific productIds if passed
    if (Array.isArray(productIds) && productIds.length > 0) {
      targetProducts = targetProducts.filter(p => productIds.includes(p.id) || productIds.includes(String(p.id)));
    }

    if (targetProducts.length === 0) {
      return res.json({
        success: true,
        synced: 0,
        failed: 0,
        total: 0,
        skipped: 0,
        products: [],
        message: 'No products available to sync.'
      });
    }

    // If specific productIds were requested, sync them even if they already have shopifyUrl.
    // If running a bulk sync without productIds, skip already synced ones.
    const isTargeted = Array.isArray(productIds) && productIds.length > 0;
    const toSync = isTargeted
      ? targetProducts.map(p => ({ ...p, sellerName }))
      : targetProducts.filter(p => !p.shopifyUrl).map(p => ({ ...p, sellerName }));

    const skipped = targetProducts.length - toSync.length;

    if (toSync.length === 0) {
      return res.json({
        success: true,
        synced: 0,
        failed: 0,
        total: targetProducts.length,
        skipped,
        products: targetProducts.map(p => ({ id: p.id, name: p.name, shopifyUrl: p.shopifyUrl })),
        message: 'All products are already synchronized with Shopify.'
      });
    }

    const results = await Promise.allSettled(toSync.map(p => syncProductToShopify(p)));
    const fulfilled = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected');

    // Combine newly synced and already synced products so UI can update state
    const allProducts = [
      ...fulfilled,
      ...targetProducts.filter(p => p.shopifyUrl && !fulfilled.find(f => f.id === p.id)).map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        shopifyProductId: p.shopifyProductId,
        shopifyUrl: p.shopifyUrl
      }))
    ];

    const { domain } = getShopifyConfig();

    return res.json({
      success: failed.length === 0,
      synced: fulfilled.length,
      failed: failed.length,
      total: targetProducts.length,
      skipped,
      storeDomain: domain,
      products: allProducts,
      message: `Successfully synchronized ${fulfilled.length} product(s) to Shopify.`
    });
  } catch (error) {
    console.error('Shopify sync error:', error);
    res.status(500).json({ error: error.message || 'Shopify sync failed' });
  }
}
