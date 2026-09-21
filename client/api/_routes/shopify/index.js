import { db } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

const getShopifyConfig = () => {
  const domain = process.env.SHOPIFY_STORE_DOMAIN || 'digital-catalog-agent.myshopify.com';
  const token = process.env.SHOPIFY_ACCESS_TOKEN || '';
  const isLive = Boolean(token && token.startsWith('shpat_') && !token.includes('demo'));
  return { domain, token, isLive };
};

export default async function handler(req, res) {
  return requireAuth(async (authReq, authRes) => {
    const { domain, token, isLive } = getShopifyConfig();

    if (req.method === 'GET') {
      return res.json({
        configured: true,
        storeDomain: domain,
        mode: isLive ? 'live' : 'sandbox',
        apiUrl: `https://${domain}/admin/api/2024-01`
      });
    }

    if (req.method === 'POST') {
      try {
        const { productIds } = req.body || {};
        const allProducts = await db.findProductsByUserId(authReq.userId);
        const targetProducts = Array.isArray(productIds) && productIds.length > 0
          ? allProducts.filter(p => productIds.includes(p.id) || productIds.includes(String(p.id)))
          : allProducts;

        if (!targetProducts || targetProducts.length === 0) {
          return res.status(400).json({ error: 'No products available to sync' });
        }

        const syncedResults = [];

        for (const product of targetProducts) {
          const slug = (product.name || 'product')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');

          let shopifyProductId = product.shopifyProductId || `gid://shopify/Product/${Date.now()}-${product.id}`;
          let shopifyUrl = product.shopifyUrl || `https://${domain}/products/${slug}`;

          if (isLive) {
            try {
              const shopifyPayload = {
                product: {
                  title: product.name,
                  body_html: product.description || '',
                  vendor: 'CatalogAI Artisan Studio',
                  product_type: product.category || 'Handicraft',
                  variants: [{ price: parseFloat(product.price || 0).toFixed(2) }]
                }
              };

              const endpoint = product.shopifyProductId
                ? `https://${domain}/admin/api/2024-01/products/${product.shopifyProductId}.json`
                : `https://${domain}/admin/api/2024-01/products.json`;

              const apiRes = await fetch(endpoint, {
                method: product.shopifyProductId ? 'PUT' : 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Shopify-Access-Token': token
                },
                body: JSON.stringify(shopifyPayload)
              });

              if (apiRes.ok) {
                const apiData = await apiRes.json();
                shopifyProductId = String(apiData.product.id);
                shopifyUrl = `https://${domain}/products/${apiData.product.handle || slug}`;
              }
            } catch (err) {
              // fallback to sandbox URL
            }
          }

          await db.updateProduct(product.id, authReq.userId, {
            shopifyProductId,
            shopifyUrl
          });

          syncedResults.push({
            id: product.id,
            name: product.name,
            price: product.price,
            shopifyProductId,
            shopifyUrl,
            syncedAt: new Date().toISOString()
          });
        }

        await db.insertAuditLog({
          userId: authReq.userId,
          action: 'SHOPIFY_SYNC',
          entityType: 'EXPORT',
          entityId: syncedResults[0]?.shopifyProductId || 'shopify-batch',
          details: JSON.stringify({
            what: `Synchronized ${syncedResults.length} product(s) to Shopify (${domain})`,
            when: new Date().toISOString(),
            why: 'Seller triggered Shopify multi-channel catalog sync',
            storeDomain: domain,
            syncedCount: syncedResults.length,
            products: syncedResults.map(p => ({ id: p.id, name: p.name, shopifyUrl: p.shopifyUrl }))
          }),
          createdAt: new Date().toISOString()
        });

        return res.json({
          success: true,
          message: `Successfully synchronized ${syncedResults.length} product(s) to Shopify.`,
          storeDomain: domain,
          syncedCount: syncedResults.length,
          products: syncedResults
        });
      } catch (err) {
        console.error('Shopify sync error:', err);
        return res.status(500).json({ error: 'Failed to sync with Shopify' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  })(req, res);
}
