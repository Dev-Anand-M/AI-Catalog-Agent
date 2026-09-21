const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { logAudit } = require('../lib/audit');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/payment - Get user's payment settings
router.get('/', async (req, res) => {
  try {
    const settings = await db.findPaymentByUserId(req.userId);

    if (!settings) {
      return res.json({
        upi: [{ id: 1, upiId: '', name: '' }],
        bank: { accountName: '', accountNumber: '', ifsc: '', bankName: '' },
        qr: null
      });
    }

    res.json({
      upi: settings.upiData ? (typeof settings.upiData === 'string' ? JSON.parse(settings.upiData) : settings.upiData) : [{ id: 1, upiId: '', name: '' }],
      bank: settings.bankAccount ? (typeof settings.bankAccount === 'string' ? JSON.parse(settings.bankAccount) : settings.bankAccount) : { accountName: '', accountNumber: '', ifsc: '', bankName: '' },
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

    const settings = await db.upsertPayment(req.userId, {
      upiData: upi ? JSON.stringify(upi) : null,
      bankAccount: bank ? JSON.stringify(bank) : null,
      qrCodeUrl: qr || null
    });

    logAudit({
      userId: req.userId,
      action: 'PAYMENT_SAVE',
      entityType: 'PAYMENT',
      entityId: req.userId,
      details: { upiCount: Array.isArray(upi) ? upi.length : 0, hasBank: !!bank, hasQr: !!qr },
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null
    });

    res.json({
      message: 'Payment settings saved successfully',
      upi: upi || [],
      bank: bank || {},
      qr: qr || null
    });
  } catch (error) {
    console.error('Save payment settings error:', error);
    res.status(500).json({ error: 'Failed to save payment settings' });
  }
});

module.exports = router;
