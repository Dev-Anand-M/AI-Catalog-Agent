const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/catalog/:userId - Public endpoint for shareable catalog
router.get('/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid catalog ID' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Catalog not found' });
    }

    const products = await prisma.product.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        price: true,
        language: true,
        imageUrl: true
      }
    });

    // Get payment settings
    const paymentSettings = await prisma.paymentSettings.findUnique({
      where: { userId }
    });

    let payment = null;
    if (paymentSettings) {
      payment = {
        upi: paymentSettings.upiData ? JSON.parse(paymentSettings.upiData).filter(u => u.upiId) : [],
        qr: paymentSettings.qrCodeUrl
      };
    }

    res.json({
      seller: { name: user.name },
      products,
      payment,
      catalogUrl: `/catalog/${userId}`
    });
  } catch (error) {
    console.error('Catalog error:', error);
    res.status(500).json({ error: 'Failed to load catalog' });
  }
});

module.exports = router;
