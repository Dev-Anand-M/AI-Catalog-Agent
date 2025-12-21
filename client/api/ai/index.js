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
  let name = productName || promptText;
  if (!name) return res.status(400).json({ error: 'Product name or promptText required' });

  // Fix common Tamil speech recognition errors
  const tamilCorrections = {
    'ஜாதி': 'ஜாடி',           // jathi → jadi (pot)
    'பீங்கானல்': 'பீங்கான்',   // peengaanal → peengaan (ceramic)
    'அரிசில்': 'அரிசி',       // arisil → arisi (rice)
    'பருப்பல்': 'பருப்பு',     // paruppal → paruppu (dal)
    'எண்ணெயல்': 'எண்ணெய்',   // ennaiyal → ennai (oil)
    'மசாலால்': 'மசாலா',       // masalaal → masala
    'துணில்': 'துணி',         // thunil → thuni (cloth)
    'சேலைல்': 'சேலை',        // selaiyil → selai (saree)
  };
  
  // Apply Tamil corrections
  for (const [wrong, correct] of Object.entries(tamilCorrections)) {
    name = name.replace(new RegExp(wrong, 'g'), correct);
  }

  const langNames = {
    en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', bn: 'Bengali'
  };

  const outputLang = langNames[language] || 'English';

  // Simpler, more direct prompt
  const systemPrompt = `You help create product listings for Indian stores. 
User input may be in Tamil, Hindi, Telugu, Kannada, Bengali or English.

TASK: Identify the product and create a listing in ${outputLang}.

Common Tamil products:
- அரிசி = Rice, நெல் = Paddy/Rice
- பருப்பு = Dal/Lentils  
- எண்ணெய் = Oil
- மசாலா = Spices
- பீங்கான் = Ceramic, ஜாடி = Pot/Jar
- மண் பானை = Clay pot

Return ONLY this JSON format:
{"name":"product name","description":"2 sentences describing this specific product","category":"Grocery","price":100}

Categories: Grocery, Clothing, Handicraft, Electronics, Other`;
  
  const aiResponse = await callPerplexity(systemPrompt, `Create listing for: ${name}`, 400);
  
  if (aiResponse) {
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.description && parsed.description.length > 15) {
          return res.json({
            name: parsed.name || name,
            description: parsed.description,
            category: parsed.category || 'Grocery',
            price: parsed.price || 0,
            suggestedPrice: parsed.price || 0,
            unit: 'kg'
          });
        }
      }
    } catch (e) {
      console.error('Parse error:', e.message, 'Response:', aiResponse?.substring(0, 200));
    }
  }
  
  // Better fallback - create a more specific description based on common words
  let description = '';
  let category = 'Grocery';
  const lowerName = name.toLowerCase();
  
  // Detect product type from Tamil/Hindi/English keywords
  if (lowerName.includes('அரிசி') || lowerName.includes('நெல்') || lowerName.includes('rice') || lowerName.includes('चावल')) {
    description = language === 'ta' 
      ? 'புதிய அரிசி, நல்ல தரமானது. சமையலுக்கு ஏற்றது, சுவையான உணவுக்கு சிறந்தது.'
      : language === 'hi' ? 'ताजा चावल, उच्च गुणवत्ता। खाना पकाने के लिए उपयुक्त।'
      : 'Fresh rice, high quality. Perfect for cooking delicious meals.';
  } else if (lowerName.includes('பருப்பு') || lowerName.includes('dal') || lowerName.includes('दाल')) {
    description = language === 'ta'
      ? 'தரமான பருப்பு, புரதம் நிறைந்தது. சாம்பார், ரசம் செய்ய சிறந்தது.'
      : language === 'hi' ? 'गुणवत्तापूर्ण दाल, प्रोटीन से भरपूर।'
      : 'Quality dal, rich in protein. Great for sambar and rasam.';
  } else if (lowerName.includes('பீங்கான்') || lowerName.includes('ஜாடி') || lowerName.includes('மண்') || lowerName.includes('பானை') || lowerName.includes('ceramic') || lowerName.includes('pot') || lowerName.includes('clay')) {
    category = 'Handicraft';
    description = language === 'ta'
      ? 'கைவினைஞர்களால் செய்யப்பட்ட அழகான பீங்கான் ஜாடி. வீட்டு அலங்காரத்திற்கும் சமையலுக்கும் ஏற்றது.'
      : language === 'hi' ? 'कारीगरों द्वारा बनाया गया सुंदर सिरेमिक बर्तन। घर की सजावट और खाना पकाने के लिए उपयुक्त।'
      : 'Beautiful ceramic pot made by artisans. Perfect for home decor and cooking.';
  } else {
    // Generic but with product name
    const fallbackDescs = {
      ta: `${name} - தரமான பொருள். எங்கள் கடையில் சிறந்த விலையில் கிடைக்கும்.`,
      hi: `${name} - उच्च गुणवत्ता वाला उत्पाद। सर्वोत्तम मूल्य पर उपलब्ध।`,
      te: `${name} - నాణ్యమైన ఉత్పత్తి. ఉత్తమ ధరలో లభిస్తుంది.`,
      kn: `${name} - ಗುಣಮಟ್ಟದ ಉತ್ಪನ್ನ. ಉತ್ತಮ ಬೆಲೆಯಲ್ಲಿ ಲಭ್ಯ.`,
      bn: `${name} - উচ্চ মানের পণ্য। সেরা দামে পাওয়া যায়।`,
      en: `${name} - Quality product at the best price.`
    };
    description = fallbackDescs[language] || fallbackDescs.en;
  }
    
  res.json({ 
    name, 
    description, 
    category, 
    price: 0, 
    suggestedPrice: 0, 
    unit: 'piece' 
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
  const { message, context = '' } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const systemPrompt = `You are a voice assistant for Digital Catalog app.
Page: ${context}

STRICT RULES:
- Maximum 2 SHORT sentences
- NO markdown, NO asterisks, NO bullet points, NO lists, NO dashes
- Plain conversational text only
- Be brief and direct
- Only answer about this app
- Do NOT suggest voice commands or say things like "say dashboard" or "try saying"`;

  let aiResponse = await callPerplexity(systemPrompt, message, 60);
  
  if (aiResponse) {
    // Aggressively clean markdown
    aiResponse = aiResponse
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\*/g, '')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/#{1,6}\s*/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^[\s]*[-•]\s*/gm, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Hard limit to 150 chars
    if (aiResponse.length > 150) {
      const truncated = aiResponse.substring(0, 150);
      const lastEnd = Math.max(truncated.lastIndexOf('.'), truncated.lastIndexOf('?'), truncated.lastIndexOf('!'));
      aiResponse = lastEnd > 50 ? aiResponse.substring(0, lastEnd + 1) : truncated + '...';
    }
    
    return res.json({ response: aiResponse });
  }
  
  res.json({ response: "I can help with your catalog." });
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
