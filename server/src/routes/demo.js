const express = require('express');

const router = express.Router();

// Demo products data
const demoProducts = [
  {
    id: 1,
    name: 'Organic Basmati Rice',
    description: 'Premium quality organic basmati rice from Punjab. Long grain, aromatic, perfect for biryani and pulao.',
    category: 'Grocery',
    price: 150,
    language: 'English',
    imageUrl: null
  },
  {
    id: 2,
    name: 'हाथ से बुनी साड़ी',
    description: 'बनारसी रेशम की हाथ से बुनी साड़ी। शादी और त्योहारों के लिए उपयुक्त।',
    category: 'Clothing',
    price: 5500,
    language: 'Hindi',
    imageUrl: null
  },
  {
    id: 3,
    name: 'Terracotta Flower Pot',
    description: 'Handcrafted terracotta pot with traditional designs. Perfect for indoor plants.',
    category: 'Handicraft',
    price: 350,
    language: 'English',
    imageUrl: null
  },
  {
    id: 4,
    name: 'கைத்தறி புடவை',
    description: 'காஞ்சிபுரம் பட்டு புடவை. திருமணம் மற்றும் விழாக்களுக்கு ஏற்றது.',
    category: 'Clothing',
    price: 8000,
    language: 'Tamil',
    imageUrl: null
  },
  {
    id: 5,
    name: 'Brass Diya Set',
    description: 'Set of 5 traditional brass diyas for puja and festivals. Handmade by local artisans.',
    category: 'Handicraft',
    price: 450,
    language: 'English',
    imageUrl: null
  },
  {
    id: 6,
    name: 'Fresh Alphonso Mangoes',
    description: 'Premium Ratnagiri Alphonso mangoes. Sweet, aromatic, and naturally ripened.',
    category: 'Grocery',
    price: 800,
    language: 'English',
    imageUrl: null
  }
];

// GET /api/demo/products - Public endpoint
router.get('/products', (req, res) => {
  res.json(demoProducts);
});

// POST /api/demo/reset - Restore Ramesh Kumar's showcase catalog & payments
router.post('/reset', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const DB_FILE = path.join(__dirname, '../../data/local_db.json');

    const pristineProducts = [
      {
        id: 'prod-1',
        userId: 'demo-artisan-1',
        name: 'Terracotta Chai Kulhad (Set of 6)',
        description: 'Handmade clay tea cups with natural earthy aroma. Eco-friendly and washable. <!--META:{"confirmationState":"seller_confirmed","costBreakdown":{"rawMaterials":50,"labor":60,"packaging":20,"marginPercent":30},"attributes":{"craft":"Mitti / Pottery","material":"Clay"},"tags":["Clay","Chai","Handmade"],"media":[],"language":"en","status":"active"}-->',
        price: 170,
        category: 'Handicrafts',
        imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
        language: 'en',
        createdAt: '2026-03-01T10:00:00.000Z'
      },
      {
        id: 'prod-2',
        userId: 'demo-artisan-1',
        name: 'Pure Khadi Handloom Cotton Kurta',
        description: 'Comfortable handspun khadi kurta dyed with traditional indigo colors. <!--META:{"confirmationState":"seller_confirmed","costBreakdown":{"rawMaterials":350,"labor":250,"packaging":40,"marginPercent":35},"attributes":{"fabric":"100% Khadi","weave":"Handloom"},"tags":["Khadi","Kurta","Handloom"],"media":[],"language":"en","status":"active"}-->',
        price: 860,
        category: 'Clothing',
        imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80',
        language: 'en',
        createdAt: '2026-03-02T11:30:00.000Z'
      },
      {
        id: 'prod-3',
        userId: 'demo-artisan-1',
        name: 'Hand-Carved Sheesham Wooden Bowl',
        description: 'Traditional carved wooden bowl polished with organic beeswax for food safety. <!--META:{"confirmationState":"ai_suggested","costBreakdown":{"rawMaterials":180,"labor":150,"packaging":30,"marginPercent":30},"attributes":{"wood":"Sheesham","finish":"Organic Wax"},"tags":["Wood","Carved","Kitchen"],"media":[],"language":"en","status":"active"}-->',
        price: 470,
        category: 'Home & Kitchen',
        imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=600&q=80',
        language: 'en',
        createdAt: '2026-03-03T14:00:00.000Z'
      }
    ];

    const pristinePayment = {
      id: 'pay-1',
      userId: 'demo-artisan-1',
      upiData: [
        {
          id: 1,
          upiId: 'ramesh.artisan@upi',
          name: 'Ramesh Kumar'
        }
      ],
      bankAccount: {
        accountName: 'Ramesh Kumar',
        accountNumber: '912345678901',
        ifsc: 'SBIN0001234',
        bankName: 'State Bank of India'
      },
      phoneNumber: '+919876543210'
    };

    let local = { users: [], products: [], payment: {}, accessRequests: [] };
    if (fs.existsSync(DB_FILE)) {
      try {
        local = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      } catch (e) {
        console.error('Failed reading local_db.json during reset:', e.message);
      }
    }

    // Keep all products that belong to OTHER sellers, and restore Ramesh's pristine products
    const nonDemoProducts = (local.products || []).filter(p => p.userId !== 'demo-artisan-1' && p.userId !== '1' && p.userId !== 1);
    local.products = [...pristineProducts, ...nonDemoProducts];

    if (!local.payment) local.payment = {};
    local.payment['demo-artisan-1'] = pristinePayment;

    fs.writeFileSync(DB_FILE, JSON.stringify(local, null, 2), 'utf8');

    res.json({
      success: true,
      message: 'Ramesh Kumar showcase catalog and payment settings have been restored to defaults.',
      products: pristineProducts
    });
  } catch (err) {
    console.error('Reset demo catalog error:', err);
    res.status(500).json({ error: 'Failed to reset demo showcase catalog' });
  }
});

module.exports = router;

