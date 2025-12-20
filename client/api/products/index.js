import { PrismaClient } from '@prisma/client';
import { getUserIdFromRequest } from '../_lib/auth.js';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const products = await prisma.product.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(products);
    }

    if (req.method === 'POST') {
      const { name, description, category, price, language, imageUrl } = req.body;
      
      if (!name) return res.status(400).json({ error: 'Name is required' });

      const product = await prisma.product.create({
        data: {
          userId,
          name,
          description: description || '',
          category: category || 'Other',
          price: parseFloat(price) || 0,
          language: language || 'en',
          imageUrl: imageUrl || null
        }
      });
      return res.status(201).json(product);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
