import { PrismaClient } from '@prisma/client';
import { getUserIdFromRequest } from '../_lib/auth.js';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const settings = await prisma.paymentSettings.findUnique({
        where: { userId }
      });
      
      if (!settings) {
        return res.json({ upiData: [], bankAccount: null, qrCodeUrl: null });
      }
      
      return res.json({
        upiData: settings.upiData ? JSON.parse(settings.upiData) : [],
        bankAccount: settings.bankAccount ? JSON.parse(settings.bankAccount) : null,
        qrCodeUrl: settings.qrCodeUrl
      });
    }

    if (req.method === 'PUT') {
      const { upiData, bankAccount, qrCodeUrl } = req.body;
      
      const settings = await prisma.paymentSettings.upsert({
        where: { userId },
        update: {
          upiData: JSON.stringify(upiData || []),
          bankAccount: bankAccount ? JSON.stringify(bankAccount) : null,
          qrCodeUrl: qrCodeUrl || null
        },
        create: {
          userId,
          upiData: JSON.stringify(upiData || []),
          bankAccount: bankAccount ? JSON.stringify(bankAccount) : null,
          qrCodeUrl: qrCodeUrl || null
        }
      });
      
      return res.json({
        upiData: settings.upiData ? JSON.parse(settings.upiData) : [],
        bankAccount: settings.bankAccount ? JSON.parse(settings.bankAccount) : null,
        qrCodeUrl: settings.qrCodeUrl
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
