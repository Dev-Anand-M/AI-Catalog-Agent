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
    const [settings, user] = await Promise.all([
      db.findPaymentByUserId(req.userId),
      db.findUserById(req.userId)
    ]);

    // The WhatsApp number lives on the user record — the payment table has no
    // phone column, so storing it there silently fell back to local storage.
    const phoneNumber = user?.phone || settings?.phoneNumber || '';

    if (!settings) {
      return res.json({
        upi: [{ id: 1, upiId: '', name: '' }],
        bank: { accountName: '', accountNumber: '', ifsc: '', bankName: '' },
        qr: null,
        phoneNumber
      });
    }

    res.json({
      upi: settings.upiData ? (typeof settings.upiData === 'string' ? JSON.parse(settings.upiData) : settings.upiData) : [{ id: 1, upiId: '', name: '' }],
      bank: settings.bankAccount ? (typeof settings.bankAccount === 'string' ? JSON.parse(settings.bankAccount) : settings.bankAccount) : { accountName: '', accountNumber: '', ifsc: '', bankName: '' },
      qr: settings.qrCodeUrl,
      phoneNumber
    });
  } catch (error) {
    console.error('Get payment settings error:', error);
    res.status(500).json({ error: 'Failed to load payment settings' });
  }
});

// PUT /api/payment - Save user's payment settings
router.put('/', async (req, res) => {
  try {
    // Accept the legacy field names too, so an older client cannot silently
    // overwrite saved payment details with nulls.
    const {
      upi, bank, qr, phoneNumber,
      upiData: legacyUpi, bankAccount: legacyBank, qrCodeUrl: legacyQr
    } = req.body || {};

    const upiValue = upi !== undefined ? upi : legacyUpi;
    const bankValue = bank !== undefined ? bank : legacyBank;
    const qrValue = qr !== undefined ? qr : legacyQr;

    await db.upsertPayment(req.userId, {
      upiData: upiValue ? JSON.stringify(upiValue) : null,
      bankAccount: bankValue ? JSON.stringify(bankValue) : null,
      qrCodeUrl: qrValue || null
    });

    // WhatsApp number belongs to the seller profile, not the payment row.
    const savedPhone = phoneNumber !== undefined ? phoneNumber : undefined;
    if (savedPhone !== undefined) {
      await db.updateUser(req.userId, { phone: savedPhone || null });
    }
    const user = await db.findUserById(req.userId);

    logAudit({
      userId: req.userId,
      action: 'PAYMENT_SAVE',
      entityType: 'PAYMENT',
      entityId: req.userId,
      details: { upiCount: Array.isArray(upiValue) ? upiValue.length : 0, hasBank: !!bankValue, hasQr: !!qrValue, hasPhone: !!phoneNumber },
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null
    });

    res.json({
      message: 'Payment settings saved successfully',
      upi: upiValue || [],
      bank: bankValue || {},
      qr: qrValue || null,
      phoneNumber: user?.phone || ''
    });
  } catch (error) {
    console.error('Save payment settings error:', error);
    res.status(500).json({ error: 'Failed to save payment settings' });
  }
});

module.exports = router;
