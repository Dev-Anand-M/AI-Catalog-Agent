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

  const systemPrompt = `Parse voice command to update product. Current: ${JSON.stringify(currentProduct || {})}
Return JSON: {"action":"update","field":"name/description/category/price","value":"new value","confidence":0.0-1.0}`;
  
  const aiResponse = await callPerplexity(systemPrompt, `Parse: "${transcript}"`, 100);
  if (aiResponse) {
    try {
      const match = aiResponse.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return res.json({ transcript, ...parsed, source: 'perplexity' });
      }
    } catch {}
  }
  
  // Fallback
  const text = transcript.toLowerCase();
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

  const systemPrompt = `You are a helpful assistant for a digital product catalog app. Page: ${context}. Be brief.`;
  const aiResponse = await callPerplexity(systemPrompt, message, 150);
  res.json({ response: aiResponse || "I'm here to help with your catalog." });
}

async function handleReadPage(req, res) {
  const { pageContent, pageName = 'page' } = req.body;
  if (!pageContent) return res.status(400).json({ error: 'Page content required' });

  const systemPrompt = `Summarize this page in 1-2 sentences for accessibility. Page: ${pageName}`;
  const aiResponse = await callPerplexity(systemPrompt, pageContent.substring(0, 1500), 100);
  res.json({ summary: aiResponse || `You are on the ${pageName} page.` });
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
