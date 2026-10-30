import { getDb } from '../_lib/db.js';
import { getUserIdFromRequest } from '../_lib/auth.js';

export default async function handler(req, res) {
  try {
    const sql = getDb();
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const [paymentResult, userResult] = await Promise.all([
        sql`SELECT * FROM "PaymentSettings" WHERE "userId" = ${userId} LIMIT 1`,
        sql`SELECT "phone" FROM "User" WHERE "id" = ${userId} LIMIT 1`
      ]);
      
      const settings = paymentResult[0] || {};
      const user = userResult[0] || {};

      let parsedUpi = [{ id: 1, upiId: '', name: '' }];
      if (settings.upiData) {
        try {
          parsedUpi = typeof settings.upiData === 'string' ? JSON.parse(settings.upiData) : settings.upiData;
        } catch {}
      }

      let parsedBank = { accountName: '', accountNumber: '', ifsc: '', bankName: '' };
      if (settings.bankAccount) {
        try {
          parsedBank = typeof settings.bankAccount === 'string' ? JSON.parse(settings.bankAccount) : settings.bankAccount;
        } catch {}
      }

      return res.json({
        upi: parsedUpi,
        bank: parsedBank,
        qr: settings.qrCodeUrl || null,
        phoneNumber: user.phone || '',
        upiData: parsedUpi,
        bankAccount: parsedBank,
        qrCodeUrl: settings.qrCodeUrl || null
      });
    }

    if (req.method === 'PUT') {
      const {
        upi, bank, qr, phoneNumber,
        upiData: legacyUpi, bankAccount: legacyBank, qrCodeUrl: legacyQr
      } = req.body || {};

      const upiValue = upi !== undefined ? upi : legacyUpi;
      const bankValue = bank !== undefined ? bank : legacyBank;
      const qrValue = qr !== undefined ? qr : legacyQr;
      
      const existing = await sql`SELECT id FROM "PaymentSettings" WHERE "userId" = ${userId} LIMIT 1`;
      
      if (existing.length > 0) {
        await sql`
          UPDATE "PaymentSettings" 
          SET "upiData" = ${JSON.stringify(upiValue || [])}, 
              "bankAccount" = ${bankValue ? JSON.stringify(bankValue) : null},
              "qrCodeUrl" = ${qrValue || null},
              "updatedAt" = NOW()
          WHERE "userId" = ${userId}
        `;
      } else {
        await sql`
          INSERT INTO "PaymentSettings" ("userId", "upiData", "bankAccount", "qrCodeUrl", "createdAt", "updatedAt")
          VALUES (${userId}, ${JSON.stringify(upiValue || [])}, ${bankValue ? JSON.stringify(bankValue) : null}, ${qrValue || null}, NOW(), NOW())
        `;
      }

      if (phoneNumber !== undefined) {
        await sql`
          UPDATE "User"
          SET "phone" = ${phoneNumber ? String(phoneNumber).trim() : null}
          WHERE "id" = ${userId}
        `;
      }
      
      return res.json({
        message: 'Payment settings saved successfully',
        upi: upiValue || [],
        bank: bankValue || null,
        qr: qrValue || null,
        phoneNumber: phoneNumber || ''
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Payment error:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
