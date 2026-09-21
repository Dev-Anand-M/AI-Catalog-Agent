/**
 * Week 1 Implementation: Product Catalog CRUD API Router
 * Developer: Dev Anand (Tech Lead)
 * Assigned Task: Voice Input & API Routes Setup
 */

const express = require('express');
const db = require('./supabaseDriver');
const jwt = require('jsonwebtoken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-anand-tarot-club-secret-key-2026';

// Auth middleware guard
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized bearer token required.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

// All product routes require valid JWT auth
router.use(requireAuth);

/**
 * GET /api/products
 * Fetch products for authenticated shopkeeper
 */
router.get('/', async (req, res) => {
  try {
    const products = await db.findProductsByUserId(req.user.userId);
    return res.json(products);
  } catch (error) {
    console.error('Fetch Products Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve products.' });
  }
});

/**
 * POST /api/products
 * Create new catalog product listing
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, category, suggestedPrice, price, imageUrl, language } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Validation failed', details: { name: 'Product name is required' } });
    }

    const finalPrice = parseFloat(price || suggestedPrice || 0);

    const product = await db.createProduct({
      userId: req.user.userId,
      name: name.trim(),
      description: description || '',
      category: category || 'Other',
      suggestedPrice: finalPrice,
      price: finalPrice,
      imageUrl: imageUrl || null,
      language: language || 'English'
    });

    return res.status(201).json(product);
  } catch (error) {
    console.error('Create Product Error:', error);
    return res.status(500).json({ error: 'Failed to create product listing.' });
  }
});

/**
 * PUT /api/products/:id
 * Update product listing
 */
router.put('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const existing = await db.findProductById(productId);

    if (!existing || existing.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Product not found or access denied.' });
    }

    const updated = await db.updateProduct(productId, req.body);
    return res.json(updated);
  } catch (error) {
    console.error('Update Product Error:', error);
    return res.status(500).json({ error: 'Failed to update product.' });
  }
});

/**
 * DELETE /api/products/:id
 * Remove product from catalog
 */
router.delete('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const existing = await db.findProductById(productId);

    if (!existing || existing.userId !== req.user.userId) {
      return res.status(404).json({ error: 'Product not found or access denied.' });
    }

    await db.deleteProduct(productId);
    return res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Delete Product Error:', error);
    return res.status(500).json({ error: 'Failed to delete product.' });
  }
});

module.exports = router;
