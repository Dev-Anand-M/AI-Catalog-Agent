import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;
    const userIdInt = parseInt(userId);

    const user = await prisma.user.findUnique({
      where: { id: userIdInt },
      select: { id: true, name: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Catalog not found' });
    }

    const products = await prisma.product.findMany({
      where: { userId: userIdInt },
      orderBy: { createdAt: 'desc' }
    });

    const paymentSettings = await prisma.paymentSettings.findUnique({
      where: { userId: userIdInt }
    });

    res.json({
      user: { id: user.id, name: user.name },
      products,
      paymentSettings: paymentSettings ? {
        upiData: paymentSettings.upiData ? JSON.parse(paymentSettings.upiData) : [],
        bankAccount: paymentSettings.bankAccount ? JSON.parse(paymentSettings.bankAccount) : null,
        qrCodeUrl: paymentSettings.qrCodeUrl
      } : null
    });
  } catch (error) {
    console.error('Catalog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
