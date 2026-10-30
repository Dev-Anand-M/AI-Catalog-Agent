import { getDb } from '../_lib/db.js';
import { getUserIdFromRequest } from '../_lib/auth.js';
import { syncProductToShopify, updateShopifyProduct } from '../shopify/sync.js';
import { formatProductRecord } from './index.js';

export default async function handler(req, res) {
  try {
    const sql = getDb();
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query;
    const productId = parseInt(id);

    if (req.method === 'GET') {
      const result = await sql`
        SELECT * FROM "Product" WHERE id = ${productId} AND "userId" = ${userId}
      `;
      if (result.length === 0) return res.status(404).json({ error: 'Product not found' });
      return res.json(formatProductRecord(result[0]));
    }

    if (req.method === 'PUT') {
      const existing = await sql`SELECT * FROM "Product" WHERE id = ${productId} AND "userId" = ${userId}`;
      if (existing.length === 0) return res.status(404).json({ error: 'Product not found' });
      const curr = existing[0];

      const { name, description, category, price, language, imageUrl, confirmationState, costBreakdown, attributes, tags, media, status } = req.body || {};

      let currentMeta = {};
      let baseDesc = curr.description || '';
      const metaMatch = baseDesc.match(/<!--META:([\s\S]*?)-->/);
      if (metaMatch) {
        try {
          currentMeta = JSON.parse(metaMatch[1]);
          baseDesc = baseDesc.replace(/<!--META:[\s\S]*?-->/, '').trim();
        } catch {}
      }

      const finalCleanDesc = (description !== undefined ? description : baseDesc).replace(/<!--META:[\s\S]*?-->/, '').trim();

      const newMeta = {
        confirmationState: confirmationState !== undefined ? confirmationState : (currentMeta.confirmationState || 'seller_confirmed'),
        status: status !== undefined ? status : (currentMeta.status || 'active'),
        attributes: attributes !== undefined ? attributes : (currentMeta.attributes || {}),
        tags: tags !== undefined ? tags : (currentMeta.tags || []),
        costBreakdown: costBreakdown !== undefined ? costBreakdown : (currentMeta.costBreakdown || null),
        media: media !== undefined ? media : (currentMeta.media || [])
      };

      const fullDesc = `${finalCleanDesc}\n<!--META:${JSON.stringify(newMeta)}-->`;
      const finalName = name !== undefined && name !== null ? String(name).trim() : curr.name;
      const finalCategory = category !== undefined && category !== null ? String(category).trim() : curr.category;
      const finalPrice = price !== undefined && price !== null ? (parseFloat(price) || 0) : curr.price;
      const finalLang = language !== undefined && language !== null ? String(language).trim() : curr.language;
      const finalImg = imageUrl !== undefined ? imageUrl : curr.imageUrl;

      const result = await sql`
        UPDATE "Product" 
        SET name = ${finalName}, 
            description = ${fullDesc}, 
            category = ${finalCategory}, 
            price = ${finalPrice}, 
            language = ${finalLang}, 
            "imageUrl" = ${finalImg}
        WHERE id = ${productId} AND "userId" = ${userId}
        RETURNING *
      `;
      
      const updatedProduct = formatProductRecord(result[0]);

      // If product is confirmed, sync to Shopify (or update existing)
      if (updatedProduct.confirmationState === 'seller_confirmed') {
        const userRows = await sql`SELECT name FROM "User" WHERE id = ${userId}`;
        const sellerName = userRows[0]?.name || 'Local Seller';

        if (updatedProduct.shopifyUrl) {
          try {
            await updateShopifyProduct({ ...updatedProduct, sellerName });
            console.log('Shopify product updated successfully:', updatedProduct.id);
          } catch (err) {
            console.error('Shopify update failed for product', updatedProduct.id, ':', err.message);
          }
        } else {
          // Newly confirmed product: sync to Shopify!
          try {
            const synced = await syncProductToShopify({ ...updatedProduct, sellerName });
            if (synced?.shopifyUrl) {
              updatedProduct.shopifyUrl = synced.shopifyUrl;
              updatedProduct.shopifyProductId = synced.shopifyProductId;
            }
            console.log('Shopify product auto-synced on confirmation:', updatedProduct.id);
          } catch (err) {
            console.error('Shopify sync on confirmation failed for product', updatedProduct.id, ':', err.message);
          }
        }
      }

      return res.json(updatedProduct);
    }

    if (req.method === 'DELETE') {
      const protectedIds = ['prod-1', 'prod-2', 'prod-3', '1', '2', '3', 1, 2, 3];
      if (protectedIds.includes(productId) || protectedIds.includes(id)) {
        return res.status(403).json({
          error: 'Core showcase products are protected from deletion to preserve the demonstration catalog. You can add new products or click "Restore Showcase Defaults".'
        });
      }
      const result = await sql`
        DELETE FROM "Product" WHERE id = ${productId} AND "userId" = ${userId} RETURNING id
      `;
      if (result.length === 0) return res.status(404).json({ error: 'Product not found' });
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Product error:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
