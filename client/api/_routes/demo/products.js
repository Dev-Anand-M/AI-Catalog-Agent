// Demo products - public endpoint
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

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.json(demoProducts);
}
