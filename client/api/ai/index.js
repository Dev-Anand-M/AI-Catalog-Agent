const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

function hasApiKey() {
  const key = process.env.PERPLEXITY_API_KEY;
  return key && key.startsWith('pplx-');
}

async function callPerplexity(systemPrompt, userPrompt, maxTokens = 200) {
  if (!hasApiKey()) return null;
  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });
    if (!response.ok) return null;
    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';
    // Remove think tags and citation references like [1], [2], etc.
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
    content = content.replace(/\[\d+\]/g, '');
    return content.trim();
  } catch { return null; }
}

async function handleGenerateProduct(req, res) {
  const { productName, promptText, language = 'en' } = req.body;
  const name = productName || promptText;
  if (!name) return res.status(400).json({ error: 'Product name or promptText required' });

  const langNames = {
    en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', bn: 'Bengali'
  };

  const systemPrompt = `You are a product catalog assistant for Indian retail stores.
The user will give you a product name which may be in ${langNames[language] || 'any Indian language'} (like Tamil தமிழ், Hindi हिंदी, etc).
Your task: Identify the product, then generate details in ${langNames[language] || 'English'}.

IMPORTANT: 
- Understand the product even if written in Tamil/Hindi/Telugu script
- For example: "உளுத்தம் பருப்பு" = Urad Dal, "அரிசி" = Rice, "பருப்பு" = Dal/Lentils
- Generate a helpful description about the product (2-3 sentences)
- Set appropriate category and typical Indian retail price

Return ONLY valid JSON (no other text):
{"name":"product name","description":"2-3 sentence description","category":"Grocery","price":100,"unit":"kg","suggestedPrice":100}

Categories: Grocery, Clothing, Handicraft, Electronics, Other`;
  
  const aiResponse = await callPerplexity(systemPrompt, `Generate product details for: ${name}`, 400);
  if (aiResponse) {
    try {
      const match = aiResponse.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.description && parsed.description.length > 5) {
          return res.json({
            name: parsed.name || name,
            description: parsed.description,
            category: parsed.category || 'Grocery',
            price: parsed.price || 0,
            suggestedPrice: parsed.suggestedPrice || parsed.price || 0,
            unit: parsed.unit || 'kg'
          });
        }
      }
    } catch (e) {
      console.error('JSON parse error:', e.message);
    }
  }
  
  // Fallback with basic description for common grocery items
  const fallbackDesc = language === 'ta' 
    ? 'தரமான இந்திய தயாரிப்பு. புதிய மற்றும் சுத்தமான பொருள்.'
    : language === 'hi'
    ? 'उच्च गुणवत्ता वाला भारतीय उत्पाद। ताजा और शुद्ध।'
    : 'Quality Indian product. Fresh and pure.';
    
  res.json({ 
    name, 
    description: fallbackDesc, 
    category: 'Grocery', 
    price: 0, 
    suggestedPrice: 0, 
    unit: 'kg' 
  });
}

async function handleParseVoice(req, res) {
  const { transcript, currentProduct } = req.body;
  if (!transcript) return res.status(400).json({ error: 'Transcript required' });

  // Normalize text: lowercase, remove punctuation, trim
  const text = transcript.toLowerCase().replace(/[.,!?।।]/g, '').trim();
  
  // Check for save commands FIRST - before sending to AI
  // Include Tamil script versions (கேன்சல் பண்ணு, சேவ் பண்ணு, etc.)
  const saveCommands = [
    // Tamil script versions (speech recognition outputs these)
    'சேவ் பண்ணு', 'சேவ் பண்ணுங்க', 'சேவ் செய்', 'சேவ் போடு',
    'சேமி பண்ணு', 'சேமி செய்', 'சேமிக்க', 'சேமி',
    'முடிஞ்சது', 'ஓகே', 'சரி', 'செய்து முடி',
    // Hindi script versions
    'सेव करो', 'सेव कर', 'सेव कर दो', 'बचाओ', 'सहेजो',
    'हो गया', 'ठीक है', 'खतम', 'पूरा हो गया',
    // Telugu script versions
    'సేవ్ చేయి', 'సేవ్ చేయండి', 'భద్రపరచు', 'అయింది', 'సరే',
    // Kannada script versions
    'ಸೇವ್ ಮಾಡು', 'ಸೇವ್ ಮಾಡಿ', 'ಉಳಿಸು', 'ಆಯ್ತು', 'ಸರಿ',
    // Bengali script versions
    'সেভ করো', 'সেভ কর', 'সংরক্ষণ করো', 'হয়ে গেলো', 'ঠিক আছে',
    // Romanized versions
    'save pannu', 'save podu', 'save karo', 'save kar', 'save cheyyi', 'save cheyyandi', 'save maadu', 'save koro',
    'ho gaya', 'hoye gelo', 'thik ache', 'theek hai', 'mudinjadhu', 'ayyindi', 'aaytu',
    'save', 'done', 'finish', 'submit', 'confirm', 'ok', 'okay',
    'khatam', 'seri', 'seyvi', 'sare', 'sari', 'ulisu'
  ];
  
  // Check for cancel commands FIRST - before sending to AI
  // Include Tamil script versions - NOTE: "cancel" sounds like "cancer" (கேன்சர்) in Tamil!
  const cancelCommands = [
    // Tamil script versions (speech recognition outputs these)
    // "cancel" is heard as "cancer" (கேன்சர்) by Tamil speech recognition!
    'கேன்சர் பண்ணு', 'கேன்சர் பண்ணுங்க', 'கேன்சர் செய்', 'கேன்சர்',
    'கேன்சல் பண்ணு', 'கேன்சல் பண்ணுங்க', 'கேன்சல் செய்', 'கேன்சல்',
    'ரத்து பண்ணு', 'ரத்து செய்', 'திரும்பு', 'பேக் போ', 'வேண்டாம்',
    // Hindi script versions
    'कैंसल करो', 'कैंसल कर', 'रद्द करो', 'वापस जाओ', 'पीछे', 'बंद करो', 'नहीं चाहिए',
    // Telugu script versions
    'క్యాన్సల్ చేయి', 'క్యాన్సల్ చేయండి', 'రద్దు చేయి', 'వెనక్కి', 'వద్దు',
    // Kannada script versions
    'ಕ್ಯಾನ್ಸಲ್ ಮಾಡು', 'ಕ್ಯಾನ್ಸಲ್ ಮಾಡಿ', 'ರದ್ದು ಮಾಡು', 'ಹಿಂದೆ ಹೋಗು', 'ಬೇಡ',
    // Bengali script versions
    'ক্যান্সেল করো', 'ক্যান্সেল কর', 'বাতিল করো', 'ফিরে যাও', 'পেছনে যাও', 'লাগবে না',
    // Romanized versions
    'cancel pannu', 'cancer pannu', 'cancel karo', 'cancel cheyyi', 'cancel maadu', 'cancel koro',
    'go back', 'wapas jao', 'back po', 'back vellu', 'back hogu', 'back jao',
    'hinde hogu', 'pechone jao', 'thirumbu', 'venakki',
    'cancel', 'cancer', 'back', 'exit', 'close', 'no', 'nahi', 'venda', 'vaddu', 'beda', 'lagbe na',
    'रद्द', 'वापस', 'peeche', 'band karo',
    'ரத்து', 'திரும்பு', 'radhu', 'thirimbu',
    'రద్దు', 'వెనక్కి', 'raddu',
    'ರದ್ದು', 'ಹಿಂದೆ', 'hinde',
    'বাতিল', 'ফিরে যাও', 'batil', 'fire jao'
  ];
  
  // Check cancel first (longer phrases checked first due to array order)
  const isCancelCommand = cancelCommands.some(cmd => text.includes(cmd.toLowerCase()));
  if (isCancelCommand) {
    return res.json({ transcript, action: 'cancel', field: null, value: null, confidence: 1.0, source: 'local' });
  }
  
  // Check save
  const isSaveCommand = saveCommands.some(cmd => text.includes(cmd.toLowerCase()));
  if (isSaveCommand) {
    return res.json({ transcript, action: 'save', field: null, value: null, confidence: 1.0, source: 'local' });
  }

  const systemPrompt = `Parse voice command to update product. Current: ${JSON.stringify(currentProduct || {})}
IMPORTANT: Only return update actions for actual field updates like price, name, description, category.
Do NOT interpret "save", "cancel", "back", "done" as field updates.
Return JSON: {"action":"update","field":"name/description/category/price","value":"new value","confidence":0.0-1.0}`;
  
  const aiResponse = await callPerplexity(systemPrompt, `Parse: "${transcript}"`, 100);
  if (aiResponse) {
    try {
      const match = aiResponse.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        // Double-check AI didn't interpret save/cancel as field update
        if (parsed.value && typeof parsed.value === 'string') {
          const valueCheck = parsed.value.toLowerCase();
          if (cancelCommands.some(cmd => valueCheck.includes(cmd.toLowerCase())) ||
              saveCommands.some(cmd => valueCheck.includes(cmd.toLowerCase()))) {
            // AI incorrectly interpreted save/cancel as a value - reject it
            return res.json({ transcript, action: 'unknown', field: null, value: null, confidence: 0.3, source: 'local' });
          }
        }
        return res.json({ transcript, ...parsed, source: 'perplexity' });
      }
    } catch {}
  }
  
  // Fallback
  let result = { action: 'unknown', field: null, value: null, confidence: 0.3 };
  const priceMatch = text.match(/price\s*(?:to|=|:)?\s*(\d+)/i);
  if (priceMatch) result = { action: 'update', field: 'price', value: parseInt(priceMatch[1]), confidence: 0.8 };
  res.json({ transcript, ...result, source: 'local' });
}

async function handleInterpret(req, res) {
  const { transcript } = req.body;
  if (!transcript) return res.status(400).json({ error: 'Transcript required' });

  const systemPrompt = `Map voice to action: dashboard, addProduct, export, payment, home, login, logout, demo, help, readPage
Return JSON: {"action":"actionName","confidence":0.0-1.0}`;
  
  const aiResponse = await callPerplexity(systemPrompt, `Interpret: "${transcript}"`, 50);
  if (aiResponse) {
    try {
      const match = aiResponse.match(/\{[\s\S]*\}/);
      if (match) return res.json(JSON.parse(match[0]));
    } catch {}
  }
  res.json({ action: 'unknown', confidence: 0 });
}

async function handleChat(req, res) {
  const { message, context = '', pageContent = '' } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  // Comprehensive knowledge about the Digital Catalog app
  const appKnowledge = `
DIGITAL CATALOG AGENT - Complete App Knowledge:

APP PURPOSE: Help small Indian retailers create digital product catalogs using voice/text in local languages (Hindi, Tamil, Telugu, Kannada, Bengali, English).

PAGES & FEATURES:

1. LANDING PAGE (/):
   - Hero section explaining the app
   - Language selector (6 Indian languages)
   - Features: Voice Input, Photo Capture, AI Descriptions, Multi-Language, Mobile-First, Share Anywhere
   - How it works: Choose Language → Describe Product → AI Generates → Share Catalog
   - Call to action buttons: Get Started, Try Demo

2. DASHBOARD (/dashboard):
   - Shows all your products in a grid
   - Each product card shows: name, description, price, category, edit/delete buttons
   - "Add Product" button to create new products
   - "Share Catalog" button to get shareable link
   - "Publish to Platforms" button for export options
   - "Payment Settings" to set up payment methods

3. ADD PRODUCT (/products/new):
   - Step 1: Choose language, then Voice or Text input
   - Voice: Tap mic and speak product description
   - Text: Type product description
   - Can upload product image
   - "Generate with AI" button creates product details
   - Step 2: Review & edit generated name, description, category, price
   - Save to add to catalog

4. EDIT PRODUCT (/products/:id/edit):
   - Same as add product but for existing products
   - Voice commands: "update price to 500", "change category to clothing", "save", "cancel"
   - Click "Voice Update" button to use voice commands

5. PAYMENT SETTINGS (/payment):
   - THREE payment options (you don't need all, pick what works for you):
     a) UPI: Add UPI IDs like yourname@upi (can add multiple)
     b) Bank Account: Account holder name, account number, IFSC code, bank name
     c) QR Code: Upload your payment QR code image
   - Customers see these on your public catalog
   - You can use ANY combination - just UPI, just QR, or all three

6. EXPORT/PUBLISH (/export):
   - Shareable catalog link to share on WhatsApp, Facebook, etc.
   - Export to platforms: Amazon, Flipkart, Google Merchant, WhatsApp Business
   - Downloads CSV files for bulk upload to seller platforms

7. PUBLIC CATALOG (/catalog/:userId):
   - What customers see when they visit your catalog link
   - Shows all your products with images, prices
   - Click product to see details and "Contact Seller on WhatsApp" button
   - Shows your payment options (UPI, QR code)

8. LOGIN/SIGNUP:
   - Create account with name, email, password
   - Login to access your catalog

VOICE COMMANDS (say these anytime):
- "Go to dashboard" / "My catalog"
- "Add product" / "New product"
- "Export" / "Publish"
- "Payment settings"
- "Help" - explains voice commands
- "Logout"

ACCESSIBILITY:
- Voice input for all major actions
- Works in 6 Indian languages
- Mobile-friendly design
- Large touch targets

IMPORTANT RULES FOR ASSISTANT:
- ONLY answer questions about this Digital Catalog app
- If asked about anything outside the app (like "president of India", weather, news, etc.), politely say: "I can only help with the Digital Catalog app. What would you like to know about creating your product catalog?"
- Always provide helpful alternatives (e.g., if no bank account, suggest UPI or QR code)
- Be an accessibility helper - describe what's on the current page when asked
`;

  const currentPageInfo = context ? `\nCURRENT PAGE: ${context}\nPAGE CONTENT: ${pageContent || 'Not provided'}` : '';

  const systemPrompt = `You are the voice assistant for Digital Catalog Agent app. You help small Indian retailers create digital product catalogs.

${appKnowledge}
${currentPageInfo}

RESPONSE RULES:
1. ONLY answer questions about this app - refuse general knowledge questions politely
2. If user asks "what's on this page" or "tell me about this page", describe the current page features in detail
3. Always suggest alternatives (e.g., "You don't need a bank account - you can use UPI or upload a QR code instead")
4. Keep responses conversational but complete - don't cut off mid-sentence
5. If on Payment page and user says "I don't have bank account", explain UPI and QR options
6. Speak in the user's language if they speak in Hindi/Tamil/etc.
7. Be helpful and encouraging - many users are new to technology`;

  const aiResponse = await callPerplexity(systemPrompt, message, 500);
  
  // Check if the response seems to be answering a general knowledge question
  const generalTopics = ['president', 'prime minister', 'capital', 'weather', 'news', 'cricket', 'movie', 'song', 'recipe'];
  const isGeneralQuestion = generalTopics.some(topic => message.toLowerCase().includes(topic));
  
  if (isGeneralQuestion) {
    res.json({ response: "I can only help with the Digital Catalog app. Would you like to know how to add products, set up payments, or share your catalog?" });
    return;
  }
  
  res.json({ response: aiResponse || "I'm here to help with your Digital Catalog. You can ask me about adding products, setting up payments, sharing your catalog, or say 'help' for voice commands." });
}

async function handleReadPage(req, res) {
  const { pageContent, pageName = 'page' } = req.body;
  if (!pageContent) return res.status(400).json({ error: 'Page content required' });

  // Detailed page descriptions for accessibility
  const pageDescriptions = {
    'landing': 'You are on the home page. This page explains Digital Catalog Agent - an app to help small retailers create digital product catalogs using voice in Indian languages. You can select your language at the top, then click Get Started to create an account, or Try Demo to see how it works.',
    'dashboard': 'You are on your Dashboard. This shows all your products. You can click Add Product to create a new product, Share Catalog to get a link for customers, Publish to Platforms to export, or Payment Settings to set up how customers pay you. Each product has Edit and Delete buttons.',
    'add-product': 'You are on the Add Product page. First select your language, then choose Voice or Text to describe your product. After describing, click Generate with AI to create product details. Then review the name, description, category and price before saving.',
    'edit-product': 'You are on the Edit Product page. You can change the product name, description, category, or price. Use the Voice Update button to make changes by speaking, like "update price to 500" or "save" to save changes.',
    'payment': 'You are on Payment Settings. You have 3 options: UPI - add your UPI ID like yourname@upi. Bank Account - add account details. QR Code - upload your payment QR image. You can use any combination. Customers will see these on your catalog.',
    'export': 'You are on the Export page. Copy your shareable catalog link to share on WhatsApp or Facebook. You can also export your products to Amazon, Flipkart, Google Shopping, or WhatsApp Business by clicking the Export buttons.',
    'login': 'You are on the Login page. Enter your email and password to access your catalog. If you do not have an account, click Sign Up.',
    'signup': 'You are on the Sign Up page. Enter your name, email, and password to create an account. Password must be at least 8 characters.'
  };

  // Try to match page name
  const pageKey = Object.keys(pageDescriptions).find(key => 
    pageName.toLowerCase().includes(key) || pageContent.toLowerCase().includes(key)
  );

  if (pageKey) {
    res.json({ summary: pageDescriptions[pageKey] });
    return;
  }

  const systemPrompt = `You are an accessibility assistant for Digital Catalog Agent app. Describe this page clearly for someone who cannot see it. Mention all buttons, forms, and what actions they can take. Be thorough but conversational.`;
  const aiResponse = await callPerplexity(systemPrompt, `Page: ${pageName}. Content: ${pageContent.substring(0, 2000)}`, 300);
  res.json({ summary: aiResponse || `You are on the ${pageName} page. Ask me what you can do here.` });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const action = req.query.action || req.body.action;
  
  switch (action) {
    case 'generate-product': return handleGenerateProduct(req, res);
    case 'parse-voice-update': return handleParseVoice(req, res);
    case 'interpret-command': return handleInterpret(req, res);
    case 'chat': return handleChat(req, res);
    case 'read-page': return handleReadPage(req, res);
    default: return res.status(400).json({ error: 'Invalid action' });
  }
}
