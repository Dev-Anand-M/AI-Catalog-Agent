const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authMiddleware);

// GET /api/products - List user's products
router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// POST /api/products - Create product
router.post('/', async (req, res) => {
  try {
    const { name, description, category, price, language, imageUrl } = req.body;

    // Validation
    const errors = {};
    if (!name || name.trim() === '') {
      errors.name = 'Name is required';
    }
    if (!description || description.trim() === '') {
      errors.description = 'Description is required';
    }
    if (!category || category.trim() === '') {
      errors.category = 'Category is required';
    }
    if (price === undefined || price === null) {
      errors.price = 'Price is required';
    } else if (typeof price !== 'number' || price <= 0) {
      errors.price = 'Price must be greater than 0';
    }
    if (!language || language.trim() === '') {
      errors.language = 'Language is required';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const product = await prisma.product.create({
      data: {
        userId: req.userId,
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        price,
        language: language.trim(),
        imageUrl: imageUrl || null
      }
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { 
        id: parseInt(req.params.id),
        userId: req.userId 
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', async (req, res) => {
  try {
    const { name, description, category, price, language, imageUrl } = req.body;

    // Check product exists and belongs to user
    const existing = await prisma.product.findFirst({
      where: { 
        id: parseInt(req.params.id),
        userId: req.userId 
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Validation
    const errors = {};
    if (name !== undefined && name.trim() === '') {
      errors.name = 'Name cannot be empty';
    }
    if (description !== undefined && description.trim() === '') {
      errors.description = 'Description cannot be empty';
    }
    if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
      errors.price = 'Price must be greater than 0';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name: name.trim() }),
        ...(description && { description: description.trim() }),
        ...(category && { category: category.trim() }),
        ...(price && { price }),
        ...(language && { language: language.trim() }),
        ...(imageUrl !== undefined && { imageUrl })
      }
    });

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
  try {
    // Check product exists and belongs to user
    const existing = await prisma.product.findFirst({
      where: { 
        id: parseInt(req.params.id),
        userId: req.userId 
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await prisma.product.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
