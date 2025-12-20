const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authMiddleware);

// GET /api/payment - Get user's payment settings
router.get('/', async (req, res) => {
  try {
    const settings = await prisma.paymentSettings.findUnique({
      where: { userId: req.userId }
    });

    if (!settings) {
      return res.json({
        upi: [{ id: 1, upiId: '', name: '' }],
        bank: { accountName: '', accountNumber: '', ifsc: '', bankName: '' },
        qr: null
      });
    }

    res.json({
      upi: settings.upiData ? JSON.parse(settings.upiData) : [{ id: 1, upiId: '', name: '' }],
      bank: settings.bankAccount ? JSON.parse(settings.bankAccount) : { accountName: '', accountNumber: '', ifsc: '', bankName: '' },
      qr: settings.qrCodeUrl
    });
  } catch (error) {
    console.error('Get payment settings error:', error);
    res.status(500).json({ error: 'Failed to load payment settings' });
  }
});

// PUT /api/payment - Save user's payment settings
router.put('/', async (req, res) => {
  try {
    const { upi, bank, qr } = req.body;

    const settings = await prisma.paymentSettings.upsert({
      where: { userId: req.userId },
      update: {
        upiData: upi ? JSON.stringify(upi) : null,
        bankAccount: bank ? JSON.stringify(bank) : null,
        qrCodeUrl: qr || null
      },
      create: {
        userId: req.userId,
        upiData: upi ? JSON.stringify(upi) : null,
        bankAccount: bank ? JSON.stringify(bank) : null,
        qrCodeUrl: qr || null
      }
    });

    res.json({
      message: 'Payment settings saved successfully',
      upi: settings.upiData ? JSON.parse(settings.upiData) : [],
      bank: settings.bankAccount ? JSON.parse(settings.bankAccount) : {},
      qr: settings.qrCodeUrl
    });
  } catch (error) {
    console.error('Save payment settings error:', error);
    res.status(500).json({ error: 'Failed to save payment settings' });
  }
});

module.exports = router;
