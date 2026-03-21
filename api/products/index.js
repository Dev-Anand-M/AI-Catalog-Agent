import { db } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { syncProductToShopify } from '../shopify/sync.js';

async function handler(req, res) {
  if (req.method === 'GET') {
    const products = await db.findProductsByUserId(req.userId);
    return res.json(products);
  }

  if (req.method === 'POST') {
    const { name, description, category, price, language, imageUrl } = req.body;

    const errors = {};
    if (!name?.trim()) errors.name = 'Name is required';
    if (!description?.trim()) errors.description = 'Description is required';
    if (!category?.trim()) errors.category = 'Category is required';
    if (price === undefined || price <= 0) errors.price = 'Price must be greater than 0';
    if (!language?.trim()) errors.language = 'Language is required';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const product = await db.createProduct({
      userId: req.userId,
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      price: parseFloat(price),
      language: language.trim(),
      imageUrl: imageUrl || null
    });

    // Auto-sync to Shopify in background (don't block response)
    syncProductToShopify(product).catch(err =>
      console.error('Shopify auto-sync failed:', err.message)
    );

    return res.status(201).json(product);
  }

  res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
