import { db } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = parseInt(req.query.userId);
  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid catalog ID' });
  }

  const user = await db.findUserById(userId);
  if (!user) {
    return res.status(404).json({ error: 'Catalog not found' });
  }

  const products = await db.findProductsByUserIdPublic(userId);
  const paymentSettings = await db.findPaymentByUserId(userId);

  let payment = null;
  if (paymentSettings) {
    const upiData = paymentSettings.upiData 
      ? (typeof paymentSettings.upiData === 'string' ? JSON.parse(paymentSettings.upiData) : paymentSettings.upiData) 
      : [];
    const bankAccount = paymentSettings.bankAccount 
      ? (typeof paymentSettings.bankAccount === 'string' ? JSON.parse(paymentSettings.bankAccount) : paymentSettings.bankAccount) 
      : null;
    payment = {
      upi: Array.isArray(upiData) ? upiData.filter(u => u && u.upiId) : [],
      bank: bankAccount && (bankAccount.accountNumber || bankAccount.ifsc || bankAccount.accountName || bankAccount.bankName) ? bankAccount : null,
      qr: paymentSettings.qrCodeUrl || null,
      phone: user.phone || paymentSettings.phoneNumber || null
    };
  } else if (user.phone) {
    payment = { upi: [], bank: null, qr: null, phone: user.phone };
  }

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
    seller: { name: user.name, id: user.id },
    products: products.map(formatProductRecord).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      price: p.price,
      language: p.language,
      imageUrl: p.imageUrl,
      shopifyUrl: p.shopifyUrl
    })),
    payment,
    catalogUrl: `${process.env.VERCEL_URL || 'localhost:5173'}/catalog/${userId}`
  });
}
