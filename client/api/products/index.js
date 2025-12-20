import { getDb } from '../_lib/db.js';
import { getUserIdFromRequest } from '../_lib/auth.js';

export default async function handler(req, res) {
  try {
    const sql = getDb();
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const products = await sql`
        SELECT * FROM "Product" WHERE "userId" = ${userId} ORDER BY "createdAt" DESC
      `;
      return res.json(products);
    }

    if (req.method === 'POST') {
      const { name, description, category, price, language, imageUrl } = req.body;
      
      if (!name) return res.status(400).json({ error: 'Name is required' });

      const result = await sql`
        INSERT INTO "Product" ("userId", name, description, category, price, language, "imageUrl", "createdAt")
        VALUES (${userId}, ${name}, ${description || ''}, ${category || 'Other'}, ${parseFloat(price) || 0}, ${language || 'en'}, ${imageUrl || null}, NOW())
        RETURNING *
      `;
      return res.status(201).json(result[0]);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Products error:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
