import { getDb } from '../_lib/db.js';
import { getUserIdFromRequest } from '../_lib/auth.js';
import { updateShopifyProduct } from '../shopify/sync.js';

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
      return res.json(result[0]);
    }

    if (req.method === 'PUT') {
      const { name, description, category, price, language, imageUrl } = req.body;
      
      const result = await sql`
        UPDATE "Product" 
        SET name = ${name}, description = ${description}, category = ${category}, 
            price = ${parseFloat(price) || 0}, language = ${language}, "imageUrl" = ${imageUrl}
        WHERE id = ${productId} AND "userId" = ${userId}
        RETURNING *
      `;
      
      if (result.length === 0) return res.status(404).json({ error: 'Product not found' });
      
      const updatedProduct = result[0];

      // If product has shopifyUrl, update it in Shopify
      if (updatedProduct.shopifyUrl) {
        const userRows = await sql`SELECT name FROM "User" WHERE id = ${userId}`;
        const sellerName = userRows[0]?.name || 'Local Seller';
        
        updateShopifyProduct({ ...updatedProduct, sellerName }).catch(err =>
          console.error('Shopify update failed:', err.message)
        );
      }

      return res.json(updatedProduct);
    }

    if (req.method === 'DELETE') {
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
