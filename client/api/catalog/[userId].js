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

    res.json({
      user: { id: user.id, name: user.name },
      products,
      paymentSettings: payment ? {
        upiData: payment.upiData ? JSON.parse(payment.upiData) : [],
        bankAccount: payment.bankAccount ? JSON.parse(payment.bankAccount) : null,
        qrCodeUrl: payment.qrCodeUrl
      } : null
    });
  } catch (error) {
    console.error('Catalog error:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
