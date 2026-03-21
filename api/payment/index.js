import { db } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

async function handler(req, res) {
  if (req.method === 'GET') {
    const settings = await db.findPaymentByUserId(req.userId);
    if (!settings) {
      return res.json({
        upi: [{ id: 1, upiId: '', name: '' }],
        bank: { accountName: '', accountNumber: '', ifsc: '', bankName: '' },
        qr: null,
        whatsappNumber: ''
      });
    }
    return res.json({
      upi: settings.upiData ? JSON.parse(settings.upiData) : [{ id: 1, upiId: '', name: '' }],
      bank: settings.bankAccount ? JSON.parse(settings.bankAccount) : { accountName: '', accountNumber: '', ifsc: '', bankName: '' },
      qr: settings.qrCodeUrl || null,
      whatsappNumber: settings.whatsappNumber || ''
    });
  }

  if (req.method === 'PUT') {
    const { upi, bank, qr, whatsappNumber } = req.body;
    await db.upsertPayment(req.userId, {
      upiData: JSON.stringify(upi),
      bankAccount: JSON.stringify(bank),
      qrCodeUrl: qr || null,
      whatsappNumber: whatsappNumber || null
    });
    return res.json({ message: 'Payment settings saved successfully', upi, bank, qr, whatsappNumber });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

export default requireAuth(handler);
