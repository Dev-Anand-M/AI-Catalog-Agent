import { db } from '../_lib/db.js';

// Public endpoint - no auth required
// Shareable catalog link: /catalog/{userId}
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = parseInt(req.query.userId);
  
  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid catalog ID' });
  }

  const user = db.findUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'Catalog not found' });
  }

  const products = db.findProductsByUserIdPublic(userId);

  res.json({
    seller: {
      name: user.name
    },
    products: products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      price: p.price,
      language: p.language,
      imageUrl: p.imageUrl
    })),
    catalogUrl: `${process.env.VERCEL_URL || 'localhost:5173'}/catalog/${userId}`
  });
}
