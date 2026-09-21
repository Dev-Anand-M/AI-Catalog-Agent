const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { generateWithFallback, auditAiRun } = require('../lib/aiProviders');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('Sharp not available in this environment, fallback active');
}

const router = express.Router();

// Rewrite ?action=query requests to path-based routes
router.use((req, res, next) => {
  if (req.query.action) {
    req.url = '/' + req.query.action;
  }
  next();
});

// Legacy single-provider check — kept only so the pricing-note path can skip
// the full chain when no keys exist at all. All real calls go through
// generateWithFallback which handles precedence + auditing.
function hasApiKey() {
  return !!(
    process.env.PERPLEXITY_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GROK_API_KEY ||
    process.env.XAI_API_KEY ||
    process.env.SAMBANOVA_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.DEEPSEEK_API_KEY
  );
}

// Run a prompt through the fallback chain and return cleaned text (or null).
// Records WHAT/WHEN/WHY audit when providers fail over.
async function callAI(systemPrompt, userPrompt, maxTokens = 500, purpose = 'ai', userId = null, ip = null) {
  if (!hasApiKey()) return null;
  const result = await generateWithFallback({ systemPrompt, userPrompt, maxTokens });
  await auditAiRun({ userId, purpose, result, ip });
  return result.text;
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

      const aiResponse = await callAI(systemPrompt, `Create English product listing from this voice input: "${promptText}"`, 500, 'generate-product', req.userId, req.headers['x-forwarded-for'] || null);
      
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
      const aiResponse = await callAI(
        `Translate to ${targetLang}. Respond with ONLY the translation.`,
        `Translate: "${text}"`,
        300,
        'translate',
        req.userId,
        req.headers['x-forwarded-for'] || null
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

      const aiResponse = await callAI(systemPrompt, userPrompt, 500, 'analyze-image', req.userId, req.headers['x-forwarded-for'] || null);
      
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

      const aiResponse = await callAI(systemPrompt, `Parse this voice command: "${transcript}"`, 200, 'parse-voice-update', req.userId, req.headers['x-forwarded-for'] || null);
      
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
      const aiResponse = await callAI(
        `Summarize this page for a visually impaired user in ${targetLang}. Keep under 80 words. Be conversational.`,
        `Page "${pageName}": ${pageContent.substring(0, 1500)}`,
        150,
        'read-page',
        req.userId,
        req.headers['x-forwarded-for'] || null
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

      const aiResponse = await callAI(systemPrompt, message, 200, 'chat', req.userId, req.headers['x-forwarded-for'] || null);
      
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

      const aiResponse = await callAI(systemPrompt, `Interpret this ${targetLang} voice command: "${transcript}"`, 100, 'interpret-command', req.userId, req.headers['x-forwarded-for'] || null);
      
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
      const aiResponse = await callAI(
        `Enhance this product description for e-commerce in ${targetLang}. Keep it 2-3 sentences. Professional and appealing.`,
        `Product: ${productName}, Category: ${category}, Description: "${description}"`,
        200,
        'enhance-description',
        req.userId,
        req.headers['x-forwarded-for'] || null
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

/**
 * Who is asking?
 *
 * The `/api/ai` helpers are open (several are usable before sign-in), so this
 * only ever *probes* identity: a missing or malformed token returns null rather
 * than a 401. The orchestrator behaves differently for an administrator, who
 * runs no store — for them "add a blue saree" must never become a product.
 */
async function resolveAdminUser(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  let decoded;
  try {
    decoded = jwt.verify(header.slice(7), secret);
  } catch {
    return null;
  }

  const user = await db.findUserById(decoded.userId).catch(() => null);
  if (!user) return null;

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = user.role === 'admin' || adminEmails.includes(String(user.email || '').toLowerCase());
  return isAdmin ? user : null;
}

/**
 * The administrator's orchestrator.
 *
 * Seller intents are deliberately absent from this prompt: there is nothing for
 * an admin to create, price or publish. What an admin *can* usefully do by voice
 * is open a console section and ask what the platform's numbers are — so those
 * two are the whole vocabulary, and the numbers come from the database rather
 * than from the model's imagination.
 */
async function orchestrateForAdmin({ promptText, language, targetLang, canUseAi, req }) {
  const [users, products, requests] = await Promise.all([
    db.findAllUsers ? db.findAllUsers().catch(() => []) : Promise.resolve([]),
    db.findAllProducts().catch(() => []),
    db.findAccessRequests ? db.findAccessRequests('all').catch(() => []) : Promise.resolve([])
  ]);

  const sellers = (users || []).filter(u => u.role !== 'admin');
  const pending = (requests || []).filter(r => r.status === 'pending');
  const facts = {
    sellers: sellers.length,
    products: (products || []).length,
    pendingAccessRequests: pending.length,
    shopifyLinked: (products || []).filter(p => p.shopifyUrl).length
  };

  const navigateTo = (destination, title, explanation) => ({
    promptText,
    intent: 'NAVIGATE',
    actionTitle: title,
    explanation,
    requiresConfirmation: false,
    data: { destination },
    source: 'local'
  });

  const lower = promptText.toLowerCase().trim();
  const asksForNumbers = /how many|how much|count|total|number of|kitne|evlo|enni|koto/.test(lower);

  if (canUseAi) {
    const systemPrompt = `You are the platform orchestrator for the administrator of a multi-seller commerce platform in India.
The administrator does NOT sell anything: never propose creating, editing, pricing or publishing a product.
Live platform facts — use these exact numbers, never invent: sellers=${facts.sellers}, products=${facts.products}, pendingAccessRequests=${facts.pendingAccessRequests}, shopifyLinked=${facts.shopifyLinked}.

Allowed intents:
1. "NAVIGATE": open a console section. destination must be one of: admin (overview), sellers, access (access requests), ai (AI providers), audit (activity log), channels (channel integrations).
2. "GENERAL_QUERY": answer a question about the platform or commerce, in ${targetLang}.
3. "READ_PAGE": read the current screen aloud.

Respond ONLY with valid JSON (no markdown):
{
  "intent": "NAVIGATE|GENERAL_QUERY|READ_PAGE",
  "actionTitle": "Short human readable summary",
  "explanation": "Why this was identified",
  "requiresConfirmation": true only if the action changes data,
  "confirmationPrompt": "Clear question in ${targetLang}, or null",
  "data": {
    "destination": "admin|sellers|access|ai|audit|channels",
    "answer": "Answer in ${targetLang} when the intent is GENERAL_QUERY"
  }
}`;

    const aiResponse = await callAI(systemPrompt, `Administrator said: "${promptText}"`, 500, 'orchestrate-admin', req.userId, req.headers['x-forwarded-for'] || null);
    if (aiResponse) {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return { ...parsed, promptText, platformFacts: facts, source: 'perplexity' };
        } catch (e) {
          console.error('Admin orchestrator JSON parse error:', e.message);
        }
      }
    }
  }

  // Local fallback: keyword routing to a console section, and real numbers for
  // counting questions. Deterministic beats guessing when no provider is set up.
  if (asksForNumbers) {
    return {
      promptText,
      intent: 'GENERAL_QUERY',
      actionTitle: 'Platform summary',
      explanation: 'Counting question answered from live platform data.',
      requiresConfirmation: false,
      confirmationPrompt: null,
      data: {
        answer: `${facts.sellers} sellers · ${facts.products} products · ${facts.shopifyLinked} linked to Shopify · ${facts.pendingAccessRequests} access requests awaiting review`
      },
      platformFacts: facts,
      source: 'local'
    };
  }

  const sections = [
    ['access', ['access request', 'request access', 'approve', 'pending', 'invite', 'onboard']],
    ['sellers', ['seller', 'merchant', 'vendor', 'account', 'store owner']],
    ['ai', ['provider', 'model', 'api key', 'ai chain', 'ai setting']],
    ['audit', ['log', 'activity', 'audit', 'event', 'history']],
    ['channels', ['channel', 'shopify', 'marketplace', 'integration', 'ondc', 'gem']]
  ];

  for (const [destination, words] of sections) {
    if (words.some(w => lower.includes(w))) {
      const titles = {
        access: 'Open access requests',
        sellers: 'Open sellers',
        ai: 'Open AI providers',
        audit: 'Open the activity log',
        channels: 'Open channel integrations'
      };
      return navigateTo(destination, titles[destination], `Administrator asked for the ${destination} section.`);
    }
  }

  if (lower.includes('console') || lower.includes('admin') || lower.includes('portal') || lower.includes('overview') || lower.includes('dashboard')) {
    return navigateTo('admin', 'Open the admin console', 'Administrator asked for the console overview.');
  }

  if (lower.includes('read') || lower.includes('screen') || lower.includes('page')) {
    return {
      promptText,
      intent: 'READ_PAGE',
      actionTitle: 'Read Current Screen',
      explanation: 'Audio overview of the current view requested.',
      requiresConfirmation: false,
      data: {},
      platformFacts: facts,
      source: 'local'
    };
  }

  return {
    promptText,
    intent: 'GENERAL_QUERY',
    actionTitle: 'Platform assistant',
    explanation: 'No provider is configured, so this is answered from platform facts.',
    requiresConfirmation: false,
    confirmationPrompt: null,
    data: {
      answer: `I can open the console for you. Right now: ${facts.sellers} sellers, ${facts.products} products, ${facts.pendingAccessRequests} access requests awaiting review. Try "open the activity log" or "show sellers".`
    },
    platformFacts: facts,
    source: 'local'
  };
}

// POST /api/ai/orchestrate - Central AI Assistant Intent Router
router.post('/orchestrate', async (req, res) => {
  try {
    const { promptText, currentContext = 'dashboard', language = 'en', existingProducts = [] } = req.body;

    if (!promptText || promptText.trim() === '') {
      return res.status(400).json({ error: 'Prompt text is required' });
    }

    const targetLang = languageNames[language] || 'English';

    // An administrator never reaches the seller prompts below: they are given a
    // console section to open or a platform number to quote, and nothing that
    // would try to write a product into an account that has none.
    const adminUser = await resolveAdminUser(req).catch(() => null);
    if (adminUser) {
      req.userId = adminUser.id;
      const proposal = await orchestrateForAdmin({
        promptText,
        language,
        targetLang,
        canUseAi: hasApiKey(),
        req
      });
      return res.json(proposal);
    }

    // If Perplexity API key is available, leverage it for smart multi-field intent understanding
    if (hasApiKey()) {
      const productListSnippet = existingProducts.slice(0, 10).map(p => `ID:${p.id} Name:"${p.name}" Category:"${p.category}" Price:${p.price}`).join('; ');
      const systemPrompt = `You are a central AI business orchestrator for small retailers and artisans in India.
The seller may speak in English, Hindi, Tamil, Telugu, Kannada, Bengali or mixed languages (Hinglish/Tanglish).
Existing products in store: [${productListSnippet}].

Analyze the seller's input and determine their exact business intent:
1. "CREATE_PRODUCT": Seller wants to add or list a product (e.g., "Add blue silk saree for 1800 in sarees").
2. "UPDATE_PRODUCT": Seller wants to edit price, name or category of existing item (e.g., "Change price of basmati rice to 160").
3. "CALCULATE_PRICING": Seller wants pricing advice based on costs (e.g., "Material 300, labour 200, suggest price").
4. "ENHANCE_IMAGE": Seller wants to clean up, enhance, or frame a product photo.
5. "NAVIGATE": Seller wants to visit dashboard, add product, export catalog, or payment settings.
6. "READ_PAGE": Seller wants audio read of current page.
7. "GENERAL_QUERY": Seller asks question about app or commerce.

Respond ONLY with valid JSON (no markdown):
{
  "intent": "CREATE_PRODUCT|UPDATE_PRODUCT|CALCULATE_PRICING|ENHANCE_IMAGE|NAVIGATE|READ_PAGE|GENERAL_QUERY",
  "actionTitle": "Short human readable summary",
  "explanation": "Why this action was identified",
  "requiresConfirmation": true/false (TRUE for any create, update, or price change),
  "confirmationPrompt": "Clear question asking seller to confirm in ${targetLang}",
  "data": {
    "name": "Product name in English if creating/updating",
    "category": "Grocery/Clothing/Handicraft/Electronics/Other",
    "price": number or null,
    "description": "Short description if creating",
    "matchedProductId": number or null,
    "destination": "dashboard/products/export/payment if navigate",
    "materialCost": number or null,
    "labourCost": number or null,
    "packagingCost": number or null,
    "answer": "Answer if general query in ${targetLang}"
  }
}`;

      const aiResponse = await callAI(systemPrompt, `Input: "${promptText}" | Current Page: ${currentContext}`, 500, 'orchestrate', req.userId, req.headers['x-forwarded-for'] || null);

      if (aiResponse) {
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return res.json({
              promptText,
              ...parsed,
              source: 'perplexity'
            });
          }
        } catch (e) {
          console.error('Orchestrator JSON parse error:', e.message);
        }
      }
    }

    // Heuristic Fallback Orchestrator
    const lower = promptText.toLowerCase().trim();

    // 1. Check for Price Calculation intent
    const hasMaterial = lower.includes('material') || lower.includes('raw') || lower.includes('सामग्री') || lower.includes('பொருள்');
    const hasLabour = lower.includes('labour') || lower.includes('labor') || lower.includes('मजदूरी') || lower.includes('கூலி');
    if (hasMaterial || hasLabour || lower.includes('cost') || lower.includes('margin') || lower.includes('calculate price')) {
      const numbers = promptText.match(/\d+/g) || [];
      const mat = numbers[0] ? parseInt(numbers[0]) : 200;
      const lab = numbers[1] ? parseInt(numbers[1]) : 150;
      return res.json({
        promptText,
        intent: 'CALCULATE_PRICING',
        actionTitle: 'Calculate Explainable Price',
        explanation: 'Detected cost estimation query with material and labor inputs.',
        requiresConfirmation: false,
        confirmationPrompt: 'Would you like to calculate the recommended selling price?',
        data: { materialCost: mat, labourCost: lab, packagingCost: 30, desiredMarginPct: 25 },
        source: 'local'
      });
    }

    // 2. Check for Image Enhancement intent
    if (lower.includes('photo') || lower.includes('image') || lower.includes('enhance') || lower.includes('picture') || lower.includes('तस्वीर') || lower.includes('படம்') || lower.includes('camera')) {
      return res.json({
        promptText,
        intent: 'ENHANCE_IMAGE',
        actionTitle: 'Open AI Image Studio',
        explanation: 'Detected request to enhance or frame a product photograph.',
        requiresConfirmation: false,
        confirmationPrompt: 'Open AI Image Studio to enhance this product photo?',
        data: {},
        source: 'local'
      });
    }

    // 3. Check for Navigation / Read Page intents
    if (lower.includes('read') || lower.includes('padho') || lower.includes('padi') || lower.includes('screen') || lower.includes('batao')) {
      return res.json({
        promptText,
        intent: 'READ_PAGE',
        actionTitle: 'Read Current Screen',
        explanation: 'Audio overview of current view requested.',
        requiresConfirmation: false,
        data: {},
        source: 'local'
      });
    }

    if (lower.includes('export') || lower.includes('publish') || lower.includes('shopify') || lower.includes('whatsapp catalog')) {
      return res.json({
        promptText,
        intent: 'NAVIGATE',
        actionTitle: 'Navigate to Export Hub',
        explanation: 'Request to publish or export catalog items.',
        requiresConfirmation: false,
        data: { destination: '/export' },
        source: 'local'
      });
    }

    if (lower.includes('payment') || lower.includes('upi') || lower.includes('bank') || lower.includes('qr')) {
      return res.json({
        promptText,
        intent: 'NAVIGATE',
        actionTitle: 'Navigate to Payment Settings',
        explanation: 'Request to manage UPI or bank payment details.',
        requiresConfirmation: false,
        data: { destination: '/payment' },
        source: 'local'
      });
    }

    // 4. Check for Update Product intent
    const isUpdate = lower.includes('update') || lower.includes('change') || lower.includes('badlo') || lower.includes('edit');
    if (isUpdate) {
      const priceMatch = lower.match(/(?:price|daam|kimat|to|rate|₹|rs)?\s*(\d+)/);
      const newPrice = priceMatch ? parseInt(priceMatch[1]) : null;
      
      // Match against existing products
      let matched = null;
      for (const prod of existingProducts) {
        if (lower.includes(prod.name.toLowerCase())) {
          matched = prod;
          break;
        }
      }

      return res.json({
        promptText,
        intent: 'UPDATE_PRODUCT',
        actionTitle: `Update ${matched ? matched.name : 'Product'}`,
        explanation: `Update requested for ${matched ? matched.name : 'product'}.`,
        requiresConfirmation: true,
        confirmationPrompt: `Shall I update ${matched ? `"${matched.name}"` : 'the product'}${newPrice ? ` price to ₹${newPrice}` : ''}?`,
        data: {
          matchedProductId: matched ? matched.id : null,
          name: matched ? matched.name : null,
          price: newPrice
        },
        source: 'local'
      });
    }

    // 5. Default to Create Product intent
    const detectedCat = detectCategory(promptText);
    const priceNum = (promptText.match(/(?:for|at|rs|₹|price|daam)?\s*(\d{2,6})/i) || [])[1];
    const fallbackPrice = priceNum ? parseInt(priceNum) : 499;

    // Clean up name from prompt
    let cleanName = promptText
      .replace(/add\s+(?:a|an)?/i, '')
      .replace(/for\s+\d+/i, '')
      .replace(/in\s+[a-z]+/i, '')
      .replace(/₹\s*\d+/i, '')
      .replace(/rs\.?\s*\d+/i, '')
      .trim();
    if (cleanName.length < 3) cleanName = 'Handcrafted Item';
    cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    res.json({
      promptText,
      intent: 'CREATE_PRODUCT',
      actionTitle: `Add "${cleanName}"`,
      explanation: 'Extracted product details from your voice command.',
      requiresConfirmation: true,
      confirmationPrompt: `Shall I add "${cleanName}" for ₹${fallbackPrice} in ${detectedCat} to your catalog?`,
      data: {
        name: cleanName,
        category: detectedCat,
        price: fallbackPrice,
        description: `Authentic ${cleanName.toLowerCase()}. Quality crafted and available for direct order.`
      },
      source: 'local'
    });
  } catch (error) {
    console.error('Orchestration error:', error);
    res.status(500).json({ error: 'Orchestration failed.' });
  }
});

// POST /api/ai/enhance-image - AI Image Studio Processing
router.post('/enhance-image', async (req, res) => {
  try {
    const { imageBase64, mode = 'studio_white' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // If sharp is available, perform genuine non-destructive product enhancement
    if (sharp) {
      try {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const inputBuffer = Buffer.from(base64Data, 'base64');

        // Color backgrounds for framing
        const bgColors = {
          studio_white: { r: 255, g: 255, b: 255, alpha: 1 },
          warm_studio: { r: 250, g: 247, b: 242, alpha: 1 },
          neutral_gray: { r: 243, g: 244, b: 246, alpha: 1 },
          sharpen: { r: 255, g: 255, b: 255, alpha: 1 }
        };
        const bg = bgColors[mode] || bgColors.studio_white;

        // Step 1: Normalize lighting, contrast, and sharpen product surface
        let pipeline = sharp(inputBuffer)
          .rotate() // Auto-orient from EXIF
          .modulate({
            brightness: 1.07, // Slight exposure lift
            saturation: 1.05  // Richer artisan colors
          })
          .sharpen({
            sigma: 1.2,
            m1: 1.4,
            m2: 0.6
          });

        // Step 2: Resize maintaining aspect ratio to high-res standard 800x800 with studio padding
        const resizedBuffer = await pipeline
          .resize(760, 760, {
            fit: 'inside',
            withoutEnlargement: false
          })
          .toBuffer();

        // Step 3: Embed inside a clean 800x800 square studio frame
        const finalBuffer = await sharp({
          create: {
            width: 800,
            height: 800,
            channels: 4,
            background: bg
          }
        })
          .composite([{ input: resizedBuffer, gravity: 'center' }])
          .jpeg({ quality: 88, mozjpeg: true })
          .toBuffer();

        const enhancedDataUrl = `data:image/jpeg;base64,${finalBuffer.toString('base64')}`;

        return res.json({
          originalImage: imageBase64,
          enhancedImage: enhancedDataUrl,
          mode,
          enhancementsApplied: [
            'Auto-exposure & contrast balanced',
            'Texture & craft weave clarity sharpened',
            '1:1 Centered professional studio framing'
          ],
          source: 'sharp_studio'
        });
      } catch (sharpError) {
        console.error('Sharp processing error:', sharpError);
      }
    }

    // Fallback if sharp unavailable
    res.json({
      originalImage: imageBase64,
      enhancedImage: imageBase64,
      mode,
      enhancementsApplied: ['Studio framing active (browser normalized)'],
      source: 'fallback'
    });
  } catch (error) {
    console.error('Image enhancement error:', error);
    res.status(500).json({ error: 'Failed to enhance image.' });
  }
});

// POST /api/ai/calculate-pricing - Explainable Dynamic Pricing Engine
router.post('/calculate-pricing', async (req, res) => {
  try {
    const {
      materialCost = 0,
      labourCost = 0,
      packagingCost = 0,
      otherCost = 0,
      desiredMarginPct = 25,
      category = 'Other',
      productName = '',
      language = 'en'
    } = req.body;

    const mat = Math.max(0, parseFloat(materialCost) || 0);
    const lab = Math.max(0, parseFloat(labourCost) || 0);
    const pkg = Math.max(0, parseFloat(packagingCost) || 0);
    const oth = Math.max(0, parseFloat(otherCost) || 0);
    const margin = Math.max(5, Math.min(80, parseFloat(desiredMarginPct) || 25));

    const totalCost = mat + lab + pkg + oth;
    const effectiveTotal = totalCost > 0 ? totalCost : 200;

    // Desired profit amount
    const profitAmount = Math.round(effectiveTotal * (margin / 100));
    const rawPrice = effectiveTotal + profitAmount;

    // Attractive merchant retail rounding (e.g. ending in 99, 49, 9)
    let recommendedPrice = rawPrice;
    if (recommendedPrice > 200) {
      const remainder = recommendedPrice % 50;
      if (remainder < 25) {
        recommendedPrice = recommendedPrice - remainder - 1; // e.g. 480 -> 499 or 449
        if (recommendedPrice < rawPrice * 0.98) recommendedPrice += 50;
      } else {
        recommendedPrice = recommendedPrice + (50 - remainder) - 1;
      }
    }

    // Competitive market price range
    const minViablePrice = Math.round(effectiveTotal * 1.10); // 10% bottom threshold
    const maxViablePrice = Math.round(effectiveTotal * (1 + (margin + 20) / 100)); // upper benchmark

    const actualProfit = Math.max(1, recommendedPrice - effectiveTotal);
    const actualMarginPct = Math.round((actualProfit / recommendedPrice) * 100);

    const targetLang = languageNames[language] || 'English';

    // Formulate a transparent, reassuring explanation for artisans & micro-retailers
    let explanation = `With ₹${effectiveTotal} total input cost (₹${mat} materials + ₹${lab} labour + ₹${pkg + oth} packaging/other), selling at ₹${recommendedPrice} secures ₹${actualProfit} profit per unit (${actualMarginPct}% margin). This stays within the recommended market range of ₹${minViablePrice} to ₹${maxViablePrice}, ensuring your product remains attractive to buyers while protecting your fair wages.`;

    // If Perplexity API is available, generate localized and nuanced market insight
    if (hasApiKey() && productName) {
      const prompt = `Give a 2-sentence pricing rationale in ${targetLang} for a seller in India: Product: "${productName}", Category: "${category}", Total cost: ₹${effectiveTotal}, Target margin: ${margin}%, Recommended price: ₹${recommendedPrice}. Keep it encouraging, simple, and realistic.`;
      const aiNote = await callAI('You are an encouraging Indian commerce advisor for small artisans.', prompt, 150, 'calculate-pricing-note', req.userId, req.headers['x-forwarded-for'] || null);
      if (aiNote) {
        explanation = aiNote;
      }
    }

    res.json({
      productName: productName || 'Product',
      category,
      recommendedPrice,
      priceRange: {
        min: minViablePrice,
        max: maxViablePrice
      },
      costBreakdown: {
        materialCost: mat,
        labourCost: lab,
        packagingCost: pkg,
        otherCost: oth,
        totalCost: effectiveTotal,
        profitAmount: actualProfit,
        marginPct: actualMarginPct
      },
      explanation,
      source: 'explainable_engine'
    });
  } catch (error) {
    console.error('Pricing calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate pricing.' });
  }
});

// Root dispatcher for ?action= query parameter support
router.post('/', (req, res) => {
  const action = req.query.action;
  const actionMap = {
    'generate-product': '/generate-product',
    'translate': '/translate',
    'analyze-image': '/analyze-image',
    'parse-voice-update': '/parse-voice-update',
    'read-page': '/read-page',
    'enhance-description': '/enhance-description',
    'interpret-command': '/interpret-command',
    'chat': '/chat',
    'orchestrate': '/orchestrate',
    'enhance-image': '/enhance-image',
    'calculate-pricing': '/calculate-pricing'
  };

  if (action && actionMap[action]) {
    req.url = actionMap[action];
    return router(req, res);
  }
  res.status(404).json({ error: 'AI action not supported' });
});

module.exports = router;
