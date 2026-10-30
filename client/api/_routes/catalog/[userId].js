import { getDb } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = getDb();
    const { userId } = req.query;
    const userIdInt = parseInt(userId);

    const userResult = await sql`SELECT id, name FROM "User" WHERE id = ${userIdInt}`;
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'Catalog not found' });
    }

    const products = await sql`
      SELECT * FROM "Product" WHERE "userId" = ${userIdInt} ORDER BY "createdAt" DESC
    `;

    const paymentResult = await sql`
      SELECT * FROM "PaymentSettings" WHERE "userId" = ${userIdInt}
    `;

    const user = userResult[0];
    const payment = paymentResult[0];

    const upiData = payment?.upiData 
      ? (typeof payment.upiData === 'string' ? JSON.parse(payment.upiData) : payment.upiData) 
      : [];
    const bankAccount = payment?.bankAccount 
      ? (typeof payment.bankAccount === 'string' ? JSON.parse(payment.bankAccount) : payment.bankAccount) 
      : null;

    const paymentObj = payment ? {
      upi: Array.isArray(upiData) ? upiData.filter(u => u && u.upiId) : [],
      bank: bankAccount && (bankAccount.accountNumber || bankAccount.ifsc || bankAccount.accountName || bankAccount.bankName) ? bankAccount : null,
      qr: payment.qrCodeUrl || null,
      phone: user.phone || payment.phoneNumber || null
    } : (user.phone ? { upi: [], bank: null, qr: null, phone: user.phone } : null);

    function formatProductRecord(product) {
      if (!product) return product;
      let cleanDesc = product.description || '';
      let meta = {};

      const metaMatch = cleanDesc.match(/<!--META:([\s\S]*?)-->/);
      if (metaMatch) {
        try {
          meta = JSON.parse(metaMatch[1]);
          cleanDesc = cleanDesc.replace(/<!--META:[\s\S]*?-->/g, '').trim();
        } catch (e) {
          console.error('Failed to parse product metadata:', e.message);
        }
      }

      return {
        ...product,
        description: cleanDesc,
        confirmationState: meta.confirmationState || product.confirmationState || 'seller_confirmed',
        status: meta.status || product.status || 'active',
        attributes: meta.attributes || product.attributes || {},
        tags: meta.tags || product.tags || [product.category, product.language].filter(Boolean),
        costBreakdown: meta.costBreakdown || product.costBreakdown || null,
        media: meta.media || (product.imageUrl ? [product.imageUrl] : [])
      };
    }

    res.json({
      seller: { id: user.id, name: user.name },
      user: { id: user.id, name: user.name },
      products: (products || []).map(formatProductRecord),
      payment: paymentObj,
      paymentSettings: paymentObj
    });
  } catch (error) {
    console.error('Catalog error:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
