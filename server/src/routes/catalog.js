const express = require('express');
const db = require('../db');
const { formatProductRecord } = require('../lib/productMeta');

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
      const bankAccount = paymentSettings.bankAccount
        ? (typeof paymentSettings.bankAccount === 'string' ? JSON.parse(paymentSettings.bankAccount) : paymentSettings.bankAccount)
        : null;
      payment = {
        upi: Array.isArray(upiData) ? upiData.filter(u => u && u.upiId) : [],
        bank: bankAccount && (bankAccount.accountNumber || bankAccount.ifsc || bankAccount.accountName || bankAccount.bankName) ? bankAccount : null,
        qr: paymentSettings.qrCodeUrl || null,
        // The buyer's "Order on WhatsApp" button needs a real destination.
        phone: user.phone || paymentSettings.phoneNumber || null
      };
    } else if (user.phone) {
      // No payment row yet, but the seller may still have a WhatsApp number.
      payment = { upi: [], bank: null, qr: null, phone: user.phone };
    }

    res.json({
      seller: { name: user.name, id: user.id },
      // Public buyers must never receive the raw `<!--META:...-->` blob.
      products: (products || []).map(formatProductRecord),
      payment,
      catalogUrl: `/catalog/${user.id}`
    });
  } catch (error) {
    console.error('Catalog error:', error);
    res.status(500).json({ error: 'Failed to load catalog' });
  }
});

module.exports = router;
