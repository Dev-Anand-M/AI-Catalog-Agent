import { getDb } from '../_lib/db.js';
import { getUserIdFromRequest } from '../_lib/auth.js';
import { syncProductToShopify } from '../shopify/sync.js';

export function formatProductRecord(product) {
  if (!product) return product;
  let cleanDesc = product.description || '';
  let meta = {};

  const metaMatch = cleanDesc.match(/<!--META:([\s\S]*?)-->/);
  if (metaMatch) {
    try {
      meta = JSON.parse(metaMatch[1]);
      cleanDesc = cleanDesc.replace(/<!--META:[\s\S]*?-->/, '').trim();
    } catch (e) {
      console.error('Failed to parse product metadata:', e.message);
    }
  }

  return {
    ...product,
    description: cleanDesc,
    confirmationState: meta.confirmationState || product.confirmationState || 'seller_confirmed',
    status: meta.status || product.status || 'active',
    attributes: meta.attributes || product.attributes || {},
    tags: meta.tags || product.tags || [product.category, product.language].filter(Boolean),
    costBreakdown: meta.costBreakdown || product.costBreakdown || null,
    media: meta.media || (product.imageUrl ? [product.imageUrl] : [])
  };
}

export function serializeProductRecord(data, existingMeta = {}) {
  const { confirmationState, costBreakdown, attributes, tags, media, status, description, ...rest } = data;
  let baseDesc = (description || '').trim();
  let currentMeta = { ...existingMeta };

  const metaMatch = baseDesc.match(/<!--META:([\s\S]*?)-->/);
  if (metaMatch) {
    try {
      currentMeta = { ...JSON.parse(metaMatch[1]), ...currentMeta };
      baseDesc = baseDesc.replace(/<!--META:[\s\S]*?-->/, '').trim();
    } catch {}
  }

  const finalMeta = {
    confirmationState: confirmationState !== undefined ? confirmationState : (currentMeta.confirmationState || 'seller_confirmed'),
    status: status !== undefined ? status : (currentMeta.status || 'active'),
    attributes: attributes !== undefined ? attributes : (currentMeta.attributes || {}),
    tags: tags !== undefined ? tags : (currentMeta.tags || []),
    costBreakdown: costBreakdown !== undefined ? costBreakdown : (currentMeta.costBreakdown || null),
    media: media !== undefined ? media : (currentMeta.media || [])
  };

  const finalDesc = `${baseDesc}\n<!--META:${JSON.stringify(finalMeta)}-->`;

  return {
    ...rest,
    description: finalDesc,
    ...finalMeta
  };
}

export default async function handler(req, res) {
  try {
    const sql = getDb();
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const products = await sql`
        SELECT * FROM "Product" WHERE "userId" = ${userId} ORDER BY "createdAt" DESC
      `;
      return res.json(products.map(formatProductRecord));
    }

    if (req.method === 'POST') {
      const { name, description, category, price, language, imageUrl, confirmationState, costBreakdown, attributes, tags, media, status } = req.body;
      
      if (!name) return res.status(400).json({ error: 'Name is required' });

      const serialized = serializeProductRecord({
        name: name.trim(),
        description: (description || '').trim(),
        category: category || 'Other',
        price: parseFloat(price) || 0,
        language: language || 'en',
        imageUrl: imageUrl || null,
        confirmationState: confirmationState || 'seller_confirmed',
        costBreakdown,
        attributes,
        tags,
        media,
        status
      });

      const result = await sql`
        INSERT INTO "Product" ("userId", name, description, category, price, language, "imageUrl", "createdAt")
        VALUES (${userId}, ${serialized.name}, ${serialized.description}, ${serialized.category}, ${serialized.price}, ${serialized.language}, ${serialized.imageUrl}, NOW())
        RETURNING *
      `;
      const newProduct = formatProductRecord(result[0]);

      // Fetch seller name for Shopify vendor field
      const userRows = await sql`SELECT name FROM "User" WHERE id = ${userId}`;
      const sellerName = userRows[0]?.name || 'Local Seller';

      // Auto-sync to Shopify in background (don't block response)
      syncProductToShopify({ ...newProduct, sellerName }).catch(err =>
        console.error('Shopify auto-sync failed:', err.message)
      );

      return res.status(201).json(newProduct);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Products error:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
