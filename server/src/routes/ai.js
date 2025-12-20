const express = require('express');

const router = express.Router();

// Perplexity API configuration
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'sonar-pro'; // Using sonar-pro for cleaner responses without reasoning

// Check if API key is configured
function hasApiKey() {
  const key = process.env.PERPLEXITY_API_KEY;
  return key && key !== 'your-perplexity-api-key-here' && key.startsWith('pplx-');
}

// Helper function to clean AI response (remove thinking tags, citations, markdown)
function cleanAiResponse(text) {
  if (!text) return text;
  // Remove <think>...</think> blocks
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Remove any remaining partial think tags
  cleaned = cleaned.replace(/<\/?think>/gi, '');
  // Remove citation references like [1], [2], etc.
  cleaned = cleaned.replace(/\[\d+\]/g, '');
  // Remove markdown bold/italic
  cleaned = cleaned.replace(/\*\*/g, '').replace(/\*/g, '');
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned.trim();
}

// Helper function to call Perplexity API
async function callPerplexity(systemPrompt, userPrompt, maxTokens = 500) {
  if (!hasApiKey()) {
    return null; // Return null to trigger fallback
  }

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      console.error('Perplexity API error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || null;
    return cleanAiResponse(content);
  } catch (error) {
    console.error('Perplexity API call failed:', error.message);
    return null;
  }
}

// Language names mapping
const languageNames = {
  en: 'English', English: 'English',
  hi: 'Hindi', Hindi: 'Hindi',
  ta: 'Tamil', Tamil: 'Tamil',
  te: 'Telugu', Telugu: 'Telugu',
  kn: 'Kannada', Kannada: 'Kannada',
  bn: 'Bengali', Bengali: 'Bengali'
};

// Category keywords for smart detection
const CATEGORY_KEYWORDS = {
  Grocery: ['food', 'rice', 'spice', 'vegetable', 'fruit', 'dal', 'oil', 'flour', 'sugar', 'tea', 'coffee', 'masala', 'pickle', 'snack', 'atta', 'ghee', 'milk', 'खाना', 'चावल', 'मसाला', 'सब्जी', 'फल', 'आटा', 'உணவு', 'அரிசி'],
  Clothing: ['cloth', 'saree', 'sari', 'shirt', 'dress', 'kurta', 'pant', 'fabric', 'cotton', 'silk', 'wool', 'lehenga', 'dupatta', 'कपड़ा', 'साड़ी', 'कुर्ता', 'புடவை', 'துணி'],
  Handicraft: ['craft', 'pot', 'art', 'handmade', 'pottery', 'wooden', 'brass', 'copper', 'clay', 'bamboo', 'jute', 'decor', 'हस्तशिल्प', 'मिट्टी', 'கைவினை'],
  Electronics: ['phone', 'electronic', 'charger', 'cable', 'battery', 'light', 'fan', 'mobile', 'computer', 'laptop', 'इलेक्ट्रॉनिक', 'மின்னணு']
};

// Detect category from text
function detectCategory(text) {
  const lowerText = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  return 'Other';
}

// Generate fallback product
function generateFallbackProduct(promptText, language) {
  const words = promptText.trim().split(/\s+/).filter(w => w.length > 2);
  const name = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || 'Premium Product';
  const category = detectCategory(promptText);
  
  const priceRanges = {
    Grocery: { min: 50, max: 500 },
    Clothing: { min: 500, max: 3000 },
    Handicraft: { min: 200, max: 2000 },
    Electronics: { min: 500, max: 5000 },
    Other: { min: 100, max: 1000 }
  };
  const range = priceRanges[category] || priceRanges.Other;
  const price = Math.floor(Math.random() * (range.max - range.min) + range.min);

  const descriptions = {
    Grocery: `Premium quality ${name.toLowerCase()}. Fresh and hygienically packed. Perfect for daily use.`,
    Clothing: `Beautiful ${name.toLowerCase()} with excellent craftsmanship. Comfortable and stylish.`,
    Handicraft: `Handcrafted ${name.toLowerCase()} by skilled artisans. Unique and authentic.`,
    Electronics: `High-quality ${name.toLowerCase()}. Reliable performance with great value.`,
    Other: `Quality ${name.toLowerCase()} at best price. Customer satisfaction guaranteed.`
  };

  return {
    name,
    description: descriptions[category] || descriptions.Other,
    category,
    suggestedPrice: price,
    language: languageNames[language] || language,
    keywords: words.slice(0, 5),
    confidence: 0.7,
    source: 'local'
  };
}

// POST /api/ai/generate-product
router.post('/generate-product', async (req, res) => {
  try {
    const { promptText, language = 'English', spokenLanguage = 'en' } = req.body;

    if (!promptText || promptText.trim() === '') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: { promptText: 'Please describe your product' } 
      });
    }

    const targetLang = languageNames[language] || 'English';
    const inputLang = languageNames[spokenLanguage] || 'mixed Indian languages';

    // Try Perplexity API first
    if (hasApiKey()) {
      const systemPrompt = `You are an AI helping Indian sellers create product listings.
The user may speak in ${inputLang}, Hinglish, Tanglish, or mixed languages. Understand their intent.

IMPORTANT: Always create the product listing in ENGLISH, regardless of input language.

Respond ONLY with valid JSON (no other text):
{"name":"Product name in English","description":"2-3 sentence professional description in English","category":"Grocery/Clothing/Handicraft/Electronics/Other","suggestedPrice":number,"keywords":["keyword1","keyword2","keyword3"]}

Rules:
- Name should be clear, professional English product name
- Description should be compelling e-commerce description in English
- Price in INR (Indian Rupees)
- Understand regional language input but output in English`;

      const aiResponse = await callPerplexity(systemPrompt, `Create English product listing from this voice input: "${promptText}"`, 500);
      
      if (aiResponse) {
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return res.json({
              name: parsed.name || 'Product',
              description: parsed.description || promptText,
              category: parsed.category || detectCategory(promptText),
              suggestedPrice: parsed.suggestedPrice || 500,
              language: 'English',
              keywords: parsed.keywords || [],
              confidence: 0.95,
              source: 'perplexity'
            });
          }
        } catch (e) {
          console.error('JSON parse error:', e.message);
        }
      }
    }

    // Fallback to local generation
    res.json(generateFallbackProduct(promptText, 'English'));
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ error: 'Failed to generate product details.' });
  }
});

// POST /api/ai/translate
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Text and target language required' });
    }

    const targetLang = languageNames[targetLanguage] || targetLanguage;

    if (hasApiKey()) {
      const aiResponse = await callPerplexity(
        `Translate to ${targetLang}. Respond with ONLY the translation.`,
        `Translate: "${text}"`,
        300
      );
      
      if (aiResponse) {
        return res.json({
          originalText: text,
          translatedText: aiResponse.trim().replace(/^["']|["']$/g, ''),
          targetLanguage: targetLang,
          source: 'perplexity'
        });
      }
    }

    // Fallback - return original
    res.json({
      originalText: text,
      translatedText: text,
      targetLanguage: targetLang,
      source: 'local'
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Translation failed.' });
  }
});

// POST /api/ai/analyze-image - AI product generation from description
// Note: Perplexity doesn't support vision, so we use text description
router.post('/analyze-image', async (req, res) => {
  try {
    const { imageData, description = '' } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Image data required' });
    }

    // If no description provided, ask user to add one
    if (!description || description.trim() === '') {
      return res.json({
        suggestedName: '',
        suggestedCategory: 'Other',
        suggestedDescription: '',
        suggestedPrice: 0,
        confidence: 0,
        source: 'needs-description',
        message: 'Please describe your product (e.g., "red silk saree" or "handmade clay pot")'
      });
    }

    // Use Perplexity to generate product details from description
    if (hasApiKey()) {
      const systemPrompt = `You are an AI helping Indian sellers create professional product listings.
Based on the product description, generate a complete e-commerce listing.

Respond ONLY with valid JSON (no other text, no markdown):
{"name":"Professional product name","description":"2-3 sentence compelling e-commerce description","category":"Grocery/Clothing/Handicraft/Electronics/Other","suggestedPrice":number,"keywords":["keyword1","keyword2","keyword3"]}

Rules:
- Name: Clear, professional product name (capitalize properly)
- Description: Compelling 2-3 sentence e-commerce description highlighting features and benefits
- Category: Must be exactly one of: Grocery, Clothing, Handicraft, Electronics, Other
- Price: Realistic price in INR (Indian Rupees) based on typical Indian market
- Keywords: 3-5 relevant search keywords`;

      const userPrompt = `Create a professional product listing for an Indian seller. 
Product description: "${description}"

Generate name, description, category, price in INR, and keywords.`;

      const aiResponse = await callPerplexity(systemPrompt, userPrompt, 500);
      
      if (aiResponse) {
        try {
          // Try to extract JSON from response
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return res.json({
              suggestedName: parsed.name || description.split(' ').slice(0, 4).join(' '),
              suggestedDescription: parsed.description || `Quality ${description}. Perfect for your needs.`,
              suggestedCategory: parsed.category || detectCategory(description),
              suggestedPrice: parsed.suggestedPrice || 500,
              keywords: parsed.keywords || [],
              confidence: 0.9,
              source: 'perplexity'
            });
          }
        } catch (e) {
          console.error('JSON parse error:', e.message);
          // If JSON parsing fails, try to extract useful info from text response
        }
      }
    }

    // Fallback - generate locally from description
    const category = detectCategory(description);
    const priceRanges = {
      Grocery: { min: 50, max: 500 },
      Clothing: { min: 500, max: 3000 },
      Handicraft: { min: 200, max: 2000 },
      Electronics: { min: 500, max: 5000 },
      Other: { min: 100, max: 1000 }
    };
    const range = priceRanges[category] || priceRanges.Other;
    const price = Math.floor(Math.random() * (range.max - range.min) + range.min);
    
    // Create a proper name from description
    const words = description.trim().split(/\s+/);
    const name = words.slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    
    res.json({
      suggestedName: name,
      suggestedCategory: category,
      suggestedDescription: `Premium quality ${description.toLowerCase()}. Excellent craftsmanship and great value for money. Perfect for your needs.`,
      suggestedPrice: price,
      keywords: words.slice(0, 5),
      confidence: 0.7,
      source: 'local'
    });
  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({ error: 'Failed to generate product details.' });
  }
});

// POST /api/ai/parse-voice-update - Parse voice commands to update product fields
router.post('/parse-voice-update', async (req, res) => {
  try {
    const { transcript, currentProduct, language = 'en' } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript required' });
    }

    const targetLang = languageNames[language] || 'English';

    if (hasApiKey()) {
      const systemPrompt = `You are a voice command parser for updating product details.
The user speaks in ${targetLang}, Hinglish, or mixed languages.
Parse their command to extract which field to update and the new value.

Current product: ${JSON.stringify(currentProduct || {})}

Respond ONLY with valid JSON:
{"action":"update","field":"name/description/category/price/language","value":"new value","confidence":0.0-1.0}

Supported fields:
- name: product name
- description: product description  
- category: Grocery/Clothing/Handicraft/Electronics/Other
- price: number in INR
- language: English/Hindi/Tamil/Telugu/Kannada/Bengali

Examples of commands:
- "update price to 500" → {"action":"update","field":"price","value":500,"confidence":0.95}
- "change category to clothing" → {"action":"update","field":"category","value":"Clothing","confidence":0.95}
- "price 200 rupees karo" → {"action":"update","field":"price","value":200,"confidence":0.9}
- "naam badlo silk saree" → {"action":"update","field":"name","value":"Silk Saree","confidence":0.9}
- "description mein likho handmade" → {"action":"update","field":"description","value":"Handmade product with excellent quality","confidence":0.85}

If command is unclear, return {"action":"unknown","confidence":0.3}`;

      const aiResponse = await callPerplexity(systemPrompt, `Parse this voice command: "${transcript}"`, 200);
      
      if (aiResponse) {
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return res.json({
              transcript,
              action: parsed.action || 'unknown',
              field: parsed.field || null,
              value: parsed.value || null,
              confidence: parsed.confidence || 0.5,
              source: 'perplexity'
            });
          }
        } catch (e) {
          console.error('Voice update parse error:', e.message);
        }
      }
    }

    // Fallback - basic pattern matching
    const text = transcript.toLowerCase();
    let result = { action: 'unknown', field: null, value: null, confidence: 0.3 };

    // Price patterns
    const priceMatch = text.match(/(?:price|daam|kimat|விலை|ధర|ಬೆಲೆ|দাম)\s*(?:to|ko|=|:)?\s*(\d+)/i) ||
                       text.match(/(\d+)\s*(?:rupees?|rs|₹|रुपये)/i);
    if (priceMatch) {
      result = { action: 'update', field: 'price', value: parseInt(priceMatch[1]), confidence: 0.8 };
    }

    // Category patterns
    const categoryMatch = text.match(/(?:category|श्रेणी|வகை|వర్గం|ವರ್ಗ|শ্রেণী)\s*(?:to|ko|=|:)?\s*(grocery|clothing|handicraft|electronics|other)/i);
    if (categoryMatch) {
      result = { action: 'update', field: 'category', value: categoryMatch[1].charAt(0).toUpperCase() + categoryMatch[1].slice(1), confidence: 0.8 };
    }

    // Name patterns
    const nameMatch = text.match(/(?:name|naam|नाम|பெயர்|పేరు|ಹೆಸರು|নাম)\s*(?:to|ko|=|:)?\s*(.+)/i);
    if (nameMatch && nameMatch[1].length > 2) {
      result = { action: 'update', field: 'name', value: nameMatch[1].trim(), confidence: 0.7 };
    }

    res.json({
      transcript,
      ...result,
      source: 'local'
    });
  } catch (error) {
    console.error('Voice update parse error:', error);
    res.status(500).json({ error: 'Failed to parse voice command.' });
  }
});

// POST /api/ai/read-page
router.post('/read-page', async (req, res) => {
  try {
    const { pageContent, pageName, language = 'en' } = req.body;

    if (!pageContent) {
      return res.status(400).json({ error: 'Page content required' });
    }

    const targetLang = languageNames[language] || 'English';

    if (hasApiKey()) {
      const aiResponse = await callPerplexity(
        `Summarize this page for a visually impaired user in ${targetLang}. Keep under 80 words. Be conversational.`,
        `Page "${pageName}": ${pageContent.substring(0, 1500)}`,
        150
      );
      
      if (aiResponse) {
        return res.json({
          summary: aiResponse.trim(),
          language: targetLang,
          source: 'perplexity'
        });
      }
    }

    // Fallback summaries
    const summaries = {
      dashboard: 'You are on your catalog dashboard. Here you can see your products, add new ones, or publish to seller platforms.',
      addproduct: 'You are on the add product page. Describe your product and AI will create a professional listing.',
      export: 'You are on the export page. Publish your catalog to Amazon, Flipkart, or WhatsApp.',
      login: 'You are on the login page. Enter your email and password.',
      signup: 'You are on the signup page. Create a new account.',
      landing: 'Welcome to Digital Catalog Agent. Create product catalogs using voice in your language.',
      payment: 'You are on payment settings. Add your UPI or bank details.',
    };

    const key = pageName?.toLowerCase().replace(/\s+/g, '') || 'default';
    const summary = summaries[key] || `You are on the ${pageName || 'current'} page.`;

    res.json({ summary, language: targetLang, source: 'local' });
  } catch (error) {
    console.error('Page reading error:', error);
    res.json({ summary: 'Unable to read page.', language: 'en', source: 'error' });
  }
});

// POST /api/ai/chat - Conversational AI for questions
router.post('/chat', async (req, res) => {
  try {
    const { message, context = '', language = 'en' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const targetLang = languageNames[language] || 'English';

    if (hasApiKey()) {
      const systemPrompt = `You are a helpful assistant for a product catalog app for Indian sellers.
The app helps sellers create product listings using voice, export to platforms like Amazon/Flipkart, and manage their catalog.

Context about current page: ${context}

Answer in ${targetLang}. Be concise (2-3 sentences max). Be helpful and friendly.
If asked about features, explain what the user can do on that page.`;

      const aiResponse = await callPerplexity(systemPrompt, message, 200);
      
      if (aiResponse) {
        return res.json({
          message,
          response: aiResponse.trim(),
          language: targetLang,
          source: 'perplexity'
        });
      }
    }

    // Fallback responses
    const fallbackResponses = {
      dashboard: 'The dashboard shows all your products. You can add new products, edit existing ones, or export your catalog to seller platforms.',
      export: 'The export page lets you download your catalog for Amazon, Flipkart, Google Merchant, or WhatsApp Business.',
      addproduct: 'Here you can add a new product. Describe it using voice or text, and AI will create a professional listing.',
      payment: 'Payment settings let you add your UPI ID, bank account, or QR code for receiving payments.',
      default: 'I can help you navigate the app. Try saying "go to dashboard", "add product", or "read page".'
    };

    const key = context.toLowerCase().replace(/\s+/g, '') || 'default';
    const response = fallbackResponses[key] || fallbackResponses.default;

    res.json({
      message,
      response,
      language: targetLang,
      source: 'local'
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Chat failed.' });
  }
});

// POST /api/ai/interpret-command - AI-powered voice command interpretation
router.post('/interpret-command', async (req, res) => {
  try {
    const { transcript, language = 'en' } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript required' });
    }

    const targetLang = languageNames[language] || 'English';

    if (hasApiKey()) {
      const systemPrompt = `You are a voice command interpreter for a product catalog app.
Given a voice transcript, determine the user's intent.
Respond ONLY with valid JSON:
{"action":"dashboard|addProduct|export|payment|home|login|signup|logout|demo|help|readPage|unknown","confidence":0.0-1.0}

Available actions:
- dashboard: view products, my catalog, show items
- addProduct: add/create/new product or item
- export: export/publish/share catalog to platforms
- payment: payment settings, bank details, UPI
- home: go to home/main page
- login: sign in, login
- signup: register, create account
- logout: sign out, logout
- demo: try demo, see examples
- help: help, what can I do, commands
- readPage: read this page, what's on screen, describe page
- unknown: if unclear`;

      const aiResponse = await callPerplexity(systemPrompt, `Interpret this ${targetLang} voice command: "${transcript}"`, 100);
      
      if (aiResponse) {
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return res.json({
              transcript,
              action: parsed.action || 'unknown',
              confidence: parsed.confidence || 0.5,
              source: 'perplexity'
            });
          }
        } catch (e) {
          console.error('Command parse error:', e.message);
        }
      }
    }

    // Fallback - basic keyword matching
    const text = transcript.toLowerCase();
    let action = 'unknown';
    
    if (text.includes('dashboard') || text.includes('catalog') || text.includes('products')) action = 'dashboard';
    else if (text.includes('add') || text.includes('new') || text.includes('create')) action = 'addProduct';
    else if (text.includes('export') || text.includes('publish')) action = 'export';
    else if (text.includes('payment') || text.includes('bank') || text.includes('upi')) action = 'payment';
    else if (text.includes('home') || text.includes('main')) action = 'home';
    else if (text.includes('login') || text.includes('sign in')) action = 'login';
    else if (text.includes('signup') || text.includes('register')) action = 'signup';
    else if (text.includes('logout') || text.includes('sign out')) action = 'logout';
    else if (text.includes('demo')) action = 'demo';
    else if (text.includes('help')) action = 'help';
    else if (text.includes('read') || text.includes('page') || text.includes('screen')) action = 'readPage';

    res.json({
      transcript,
      action,
      confidence: action === 'unknown' ? 0.3 : 0.7,
      source: 'local'
    });
  } catch (error) {
    console.error('Command interpretation error:', error);
    res.status(500).json({ error: 'Command interpretation failed.' });
  }
});

// POST /api/ai/enhance-description
router.post('/enhance-description', async (req, res) => {
  try {
    const { description, productName, category, language = 'English' } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description required' });
    }

    const targetLang = languageNames[language] || 'English';

    if (hasApiKey()) {
      const aiResponse = await callPerplexity(
        `Enhance this product description for e-commerce in ${targetLang}. Keep it 2-3 sentences. Professional and appealing.`,
        `Product: ${productName}, Category: ${category}, Description: "${description}"`,
        200
      );
      
      if (aiResponse) {
        return res.json({
          originalDescription: description,
          enhancedDescription: aiResponse.trim().replace(/^["']|["']$/g, ''),
          language: targetLang,
          source: 'perplexity'
        });
      }
    }

    // Fallback - return original
    res.json({
      originalDescription: description,
      enhancedDescription: description,
      language: targetLang,
      source: 'local'
    });
  } catch (error) {
    console.error('Enhancement error:', error);
    res.status(500).json({ error: 'Enhancement failed.' });
  }
});

module.exports = router;
