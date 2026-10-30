import { db } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

async function handler(req, res) {
  if (req.method === 'GET') {
    const [settings, user] = await Promise.all([
      db.findPaymentByUserId(req.userId),
      db.findUserById(req.userId)
    ]);
    const phoneNumber = user?.phone || '';
    if (!settings) {
      return res.json({
        upi: [{ id: 1, upiId: '', name: '' }],
        bank: { accountName: '', accountNumber: '', ifsc: '', bankName: '' },
        qr: null,
        phoneNumber,
        whatsappNumber: phoneNumber
      });
    }
    const upi = settings.upiData
      ? (typeof settings.upiData === 'string' ? JSON.parse(settings.upiData) : settings.upiData)
      : [{ id: 1, upiId: '', name: '' }];
    const bank = settings.bankAccount
      ? (typeof settings.bankAccount === 'string' ? JSON.parse(settings.bankAccount) : settings.bankAccount)
      : { accountName: '', accountNumber: '', ifsc: '', bankName: '' };

    return res.json({
      upi,
      bank,
      qr: settings.qrCodeUrl || null,
      phoneNumber,
      whatsappNumber: phoneNumber
    });
  }

  if (req.method === 'PUT') {
    const {
      upi, bank, qr, phoneNumber, whatsappNumber,
      upiData: legacyUpi, bankAccount: legacyBank, qrCodeUrl: legacyQr
    } = req.body || {};

    const upiValue = upi !== undefined ? upi : legacyUpi;
    const bankValue = bank !== undefined ? bank : legacyBank;
    const qrValue = qr !== undefined ? qr : legacyQr;
    const phone = phoneNumber !== undefined ? phoneNumber : whatsappNumber;

    await db.upsertPayment(req.userId, {
      upiData: upiValue ? JSON.stringify(upiValue) : '[]',
      bankAccount: bankValue ? JSON.stringify(bankValue) : null,
      qrCodeUrl: qrValue || null
    });

    if (phone !== undefined) {
      await db.updateUser(req.userId, { phone: phone ? String(phone).trim() : null });
    }

    // Audit: payment settings saved (non-blocking)
    db.insertAuditLog({
      userId: req.userId,
      action: 'PAYMENT_SAVE',
      entityType: 'PAYMENT',
      entityId: req.userId,
      details: JSON.stringify({ upiCount: Array.isArray(upiValue) ? upiValue.length : 0, hasBank: !!bankValue, hasQr: !!qrValue }),
      ip: req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null,
      createdAt: new Date().toISOString()
    }).catch(() => {});

    return res.json({
      message: 'Payment settings saved successfully',
      upi: upiValue || [],
      bank: bankValue || {},
      qr: qrValue || null,
      phoneNumber: phone || ''
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
