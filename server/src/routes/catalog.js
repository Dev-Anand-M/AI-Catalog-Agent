const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/catalog/:userId - Public endpoint for shareable catalog
router.get('/:userId', async (req, res) => {
  try {
    const rawUserId = req.params.userId;
    
    if (!rawUserId) {
      return res.status(400).json({ error: 'Invalid catalog ID' });
    }

    // Try finding by exact id or email or fallback for demo artisans
    let user = await db.findUserById(rawUserId);
    if (!user) {
      user = await db.findUserByEmail(rawUserId);
    }
    if (!user && (rawUserId === 'demo-artisan-1' || rawUserId === '1' || rawUserId === 'demo' || rawUserId === 'ramesh' || rawUserId === 'ramesh-handicrafts')) {
      user = await db.findUserByEmail('demo@store.com');
    }

    if (!user) {
      return res.status(404).json({ error: 'Catalog not found' });
    }

    const products = await db.findProductsByUserId(user.id);
    const paymentSettings = await db.findPaymentByUserId(user.id);

    let payment = null;
    if (paymentSettings) {
      const upiData = paymentSettings.upiData 
        ? (typeof paymentSettings.upiData === 'string' ? JSON.parse(paymentSettings.upiData) : paymentSettings.upiData) 
        : [];
      payment = {
        upi: Array.isArray(upiData) ? upiData.filter(u => u && u.upiId) : [],
        qr: paymentSettings.qrCodeUrl
      };
    }

    res.json({
      seller: { name: user.name, id: user.id },
      products: products || [],
      payment,
      catalogUrl: `/catalog/${user.id}`
    });
  } catch (error) {
    console.error('Catalog error:', error);
    res.status(500).json({ error: 'Failed to load catalog' });
  }
});

module.exports = router;
