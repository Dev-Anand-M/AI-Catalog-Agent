import { PrismaClient } from '@prisma/client';
import { getUserIdFromRequest } from '../_lib/auth.js';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query;
    const productId = parseInt(id);

    if (req.method === 'GET') {
      const product = await prisma.product.findFirst({
        where: { id: productId, userId }
      });
      if (!product) return res.status(404).json({ error: 'Product not found' });
      return res.json(product);
    }

    if (req.method === 'PUT') {
      const { name, description, category, price, language, imageUrl } = req.body;
      
      const product = await prisma.product.updateMany({
        where: { id: productId, userId },
        data: {
          name,
          description,
          category,
          price: parseFloat(price) || 0,
          language,
          imageUrl
        }
      });
      
      if (product.count === 0) return res.status(404).json({ error: 'Product not found' });
      
      const updated = await prisma.product.findUnique({ where: { id: productId } });
      return res.json(updated);
    }

    if (req.method === 'DELETE') {
      const result = await prisma.product.deleteMany({
        where: { id: productId, userId }
      });
      if (result.count === 0) return res.status(404).json({ error: 'Product not found' });
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
