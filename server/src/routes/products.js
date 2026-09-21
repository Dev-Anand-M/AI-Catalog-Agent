const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Helper functions to unpack/pack rich product metadata safely
function formatProductRecord(product) {
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

function serializeProductRecord(data) {
  const { confirmationState, costBreakdown, attributes, tags, media, status, description, ...rest } = data;
  const hasMeta = confirmationState || costBreakdown || attributes || tags || media || status;
  
  let finalDesc = (description || '').trim();
  if (hasMeta) {
    finalDesc = finalDesc.replace(/<!--META:[\s\S]*?-->/, '').trim();
    const meta = {
      confirmationState: confirmationState || 'seller_confirmed',
      status: status || 'active',
      attributes: attributes || {},
      tags: tags || [],
      costBreakdown: costBreakdown || null,
      media: media || []
    };
    finalDesc = `${finalDesc}\n<!--META:${JSON.stringify(meta)}-->`;
  }

  return {
    ...rest,
    description: finalDesc
  };
}

// GET /api/products - List user's products
router.get('/', async (req, res) => {
  try {
    const products = await db.findProductsByUserId(req.userId);
    res.json((products || []).map(formatProductRecord));
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// POST /api/products - Create product
router.post('/', async (req, res) => {
  try {
    const { name, description, category, price, language, imageUrl, confirmationState, costBreakdown, attributes, tags, media, status } = req.body;

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

    const recordData = serializeProductRecord({
      userId: req.userId,
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      price,
      language: language.trim(),
      imageUrl: imageUrl || null,
      confirmationState: confirmationState || 'seller_confirmed',
      costBreakdown,
      attributes,
      tags,
      media,
      status
    });

    const product = await db.createProduct(recordData);

    logAudit({
      userId: req.userId,
      action: 'PRODUCT_CREATE',
      entityType: 'PRODUCT',
      entityId: product?.id,
      details: {
        what: `Created product "${name.trim()}" (${category.trim()}) at ₹${price}`,
        when: new Date().toISOString(),
        why: 'Seller added a new item to their catalog',
        name: name.trim(),
        category: category.trim(),
        price
      },
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null
    });

    res.status(201).json(formatProductRecord(product));
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await db.findProductById(req.params.id, req.userId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(formatProductRecord(product));
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', async (req, res) => {
  try {
    const { name, description, category, price, language, imageUrl, confirmationState, costBreakdown, attributes, tags, media, status } = req.body;

    const existing = await db.findProductById(req.params.id, req.userId);

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

    const mergedDesc = description !== undefined ? description : existing.description;
    const recordData = serializeProductRecord({
      ...(name && { name: name.trim() }),
      description: mergedDesc,
      ...(category && { category: category.trim() }),
      ...(price && { price }),
      ...(language && { language: language.trim() }),
      ...(imageUrl !== undefined && { imageUrl }),
      confirmationState,
      costBreakdown,
      attributes,
      tags,
      media,
      status
    });

    const product = await db.updateProduct(req.params.id, req.userId, recordData);

    // Compute a precise field-level diff for the audit trail
    const changedFields = {};
    const fieldLabels = { name: 'name', description: 'description', category: 'category', price: 'price', language: 'language', imageUrl: 'image' };
    for (const field of Object.keys(fieldLabels)) {
      const newVal = req.body[field];
      if (newVal !== undefined && String(newVal) !== String(existing[field] ?? '')) {
        changedFields[field] = {
          from: existing[field] ?? null,
          to: ['price'].includes(field) ? newVal : String(newVal).slice(0, 120)
        };
      }
    }
    const changeSummary = Object.keys(changedFields).length > 0
      ? Object.entries(changedFields).map(([f, v]) => `${fieldLabels[f]}: "${String(v.from).slice(0, 40)}" → "${String(v.to).slice(0, 40)}"`).join('; ')
      : 'metadata only';

    logAudit({
      userId: req.userId,
      action: 'PRODUCT_UPDATE',
      entityType: 'PRODUCT',
      entityId: req.params.id,
      details: {
        what: `Updated "${existing.name}" — ${changeSummary}`,
        when: new Date().toISOString(),
        why: 'Seller edited product details',
        changes: changedFields,
        name: name || undefined,
        category: category || undefined,
        price: price || undefined
      },
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null
    });

    res.json(formatProductRecord(product || { ...existing, ...recordData }));
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.findProductById(req.params.id, req.userId);

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await db.deleteProduct(req.params.id, req.userId);

    logAudit({
      userId: req.userId,
      action: 'PRODUCT_DELETE',
      entityType: 'PRODUCT',
      entityId: req.params.id,
      details: {
        what: `Deleted "${existing.name}" (was ₹${existing.price}, ${existing.category})`,
        when: new Date().toISOString(),
        why: 'Seller removed the item from their catalog',
        name: existing.name,
        price: existing.price
      },
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

module.exports = router;
