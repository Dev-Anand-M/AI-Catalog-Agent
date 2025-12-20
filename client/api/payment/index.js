import { getDb } from '../_lib/db.js';
import { getUserIdFromRequest } from '../_lib/auth.js';

export default async function handler(req, res) {
  try {
    const sql = getDb();
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const result = await sql`
        SELECT * FROM "PaymentSettings" WHERE "userId" = ${userId}
      `;
      
      if (result.length === 0) {
        return res.json({ upiData: [], bankAccount: null, qrCodeUrl: null });
      }
      
      const settings = result[0];
      return res.json({
        upiData: settings.upiData ? JSON.parse(settings.upiData) : [],
        bankAccount: settings.bankAccount ? JSON.parse(settings.bankAccount) : null,
        qrCodeUrl: settings.qrCodeUrl
      });
    }

    if (req.method === 'PUT') {
      const { upiData, bankAccount, qrCodeUrl } = req.body;
      
      const existing = await sql`SELECT id FROM "PaymentSettings" WHERE "userId" = ${userId}`;
      
      if (existing.length > 0) {
        await sql`
          UPDATE "PaymentSettings" 
          SET "upiData" = ${JSON.stringify(upiData || [])}, 
              "bankAccount" = ${bankAccount ? JSON.stringify(bankAccount) : null},
              "qrCodeUrl" = ${qrCodeUrl || null},
              "updatedAt" = NOW()
          WHERE "userId" = ${userId}
        `;
      } else {
        await sql`
          INSERT INTO "PaymentSettings" ("userId", "upiData", "bankAccount", "qrCodeUrl", "createdAt", "updatedAt")
          VALUES (${userId}, ${JSON.stringify(upiData || [])}, ${bankAccount ? JSON.stringify(bankAccount) : null}, ${qrCodeUrl || null}, NOW(), NOW())
        `;
      }
      
      return res.json({
        upiData: upiData || [],
        bankAccount: bankAccount || null,
        qrCodeUrl: qrCodeUrl || null
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Payment error:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
