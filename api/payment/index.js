import { db } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

// In-memory payment storage (for Vercel serverless)
const paymentStore = new Map();

async function handler(req, res) {
  if (req.method === 'GET') {
    const settings = paymentStore.get(req.userId);
    if (!settings) {
      return res.json({
        upi: [{ id: 1, upiId: '', name: '' }],
        bank: { accountName: '', accountNumber: '', ifsc: '', bankName: '' },
        qr: null
      });
    }
    return res.json(settings);
  }

  if (req.method === 'PUT') {
    const { upi, bank, qr } = req.body;
    const settings = { upi, bank, qr };
    paymentStore.set(req.userId, settings);
    return res.json({
      message: 'Payment settings saved successfully',
      ...settings
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
