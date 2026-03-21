import { db } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

async function handler(req, res) {
  const id = parseInt(req.query.id);

  if (req.method === 'GET') {
    const product = await db.findProductById(id, req.userId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    return res.json(product);
  }

  if (req.method === 'PUT') {
    const { name, description, category, price, language, imageUrl } = req.body;

    const errors = {};
    if (name !== undefined && !name.trim()) errors.name = 'Name cannot be empty';
    if (description !== undefined && !description.trim()) errors.description = 'Description cannot be empty';
    if (price !== undefined && price <= 0) errors.price = 'Price must be greater than 0';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const product = await db.updateProduct(id, req.userId, {
      ...(name && { name: name.trim() }),
      ...(description && { description: description.trim() }),
      ...(category && { category: category.trim() }),
      ...(price && { price: parseFloat(price) }),
      ...(language && { language: language.trim() }),
      ...(imageUrl !== undefined && { imageUrl })
    });

    if (!product) return res.status(404).json({ error: 'Product not found' });
    return res.json(product);
  }

  if (req.method === 'DELETE') {
    const deleted = await db.deleteProduct(id, req.userId);
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    return res.json({ message: 'Product deleted successfully' });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
