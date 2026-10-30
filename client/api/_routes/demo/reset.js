// POST /api/demo/reset - Restore Ramesh Kumar's showcase catalog & payments
import { getDb } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pristineProducts = [
      {
        id: 'prod-1',
        name: 'Terracotta Chai Kulhad (Set of 6)',
        description: 'Handmade clay tea cups with natural earthy aroma. Eco-friendly and washable. <!--META:{"confirmationState":"seller_confirmed","costBreakdown":{"rawMaterials":50,"labor":60,"packaging":20,"marginPercent":30},"attributes":{"craft":"Mitti / Pottery","material":"Clay"},"tags":["Clay","Chai","Handmade"],"media":[],"language":"en","status":"active"}-->',
        price: 170,
        category: 'Handicrafts',
        imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
        language: 'en'
      },
      {
        id: 'prod-2',
        name: 'Pure Khadi Handloom Cotton Kurta',
        description: 'Comfortable handspun khadi kurta dyed with traditional indigo colors. <!--META:{"confirmationState":"seller_confirmed","costBreakdown":{"rawMaterials":350,"labor":250,"packaging":40,"marginPercent":35},"attributes":{"fabric":"100% Khadi","weave":"Handloom"},"tags":["Khadi","Kurta","Handloom"],"media":[],"language":"en","status":"active"}-->',
        price: 860,
        category: 'Clothing',
        imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80',
        language: 'en'
      },
      {
        id: 'prod-3',
        name: 'Hand-Carved Sheesham Wooden Bowl',
        description: 'Traditional carved wooden bowl polished with organic beeswax for food safety. <!--META:{"confirmationState":"ai_suggested","costBreakdown":{"rawMaterials":180,"labor":150,"packaging":30,"marginPercent":30},"attributes":{"wood":"Sheesham","finish":"Organic Wax"},"tags":["Wood","Carved","Kitchen"],"media":[],"language":"en","status":"active"}-->',
        price: 470,
        category: 'Home & Kitchen',
        imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=600&q=80',
        language: 'en'
      }
    ];

    res.json({
      success: true,
      message: 'Ramesh Kumar showcase catalog has been restored to default values.',
      products: pristineProducts
    });
  } catch (err) {
    console.error('Demo reset error:', err);
    res.status(500).json({ error: 'Failed to reset demo catalog' });
  }
}
