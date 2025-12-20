const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'sonar-pro';

function hasApiKey() {
  const key = process.env.PERPLEXITY_API_KEY;
  return key && key !== 'your-perplexity-api-key-here' && key.startsWith('pplx-');
}

function cleanAiResponse(text) {
  if (!text) return text;
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/<\/?think>/gi, '');
  cleaned = cleaned.replace(/\[\d+\]/g, '');
  cleaned = cleaned.replace(/\*\*/g, '').replace(/\*/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned.trim();
}

async function callPerplexity(systemPrompt, userPrompt, maxTokens = 500) {
  if (!hasApiKey()) return null;

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

    if (!response.ok) return null;
    const data = await response.json();
    return cleanAiResponse(data.choices?.[0]?.message?.content);
  } catch {
    return null;
  }
}

const languageNames = {
  en: 'English', English: 'English', hi: 'Hindi', Hindi: 'Hindi',
  ta: 'Tamil', Tamil: 'Tamil', te: 'Telugu', Telugu: 'Telugu',
  kn: 'Kannada', Kannada: 'Kannada', bn: 'Bengali', Bengali: 'Bengali'
};

const CATEGORY_KEYWORDS = {
  Grocery: ['food', 'rice', 'spice', 'vegetable', 'fruit', 'dal', 'oil', 'flour', 'sugar', 'tea', 'coffee', 'masala'],
  Clothing: ['cloth', 'saree', 'sari', 'shirt', 'dress', 'kurta', 'fabric', 'cotton', 'silk'],
  Handicraft: ['craft', 'pot', 'art', 'handmade', 'pottery', 'wooden', 'brass', 'clay'],
  Electronics: ['phone', 'electronic', 'charger', 'cable', 'battery', 'light', 'fan']
};

function detectCategory(text) {
  const lowerText = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lowerText.includes(k))) return category;
  }
  return 'Other';
}

function generateFallback(promptText) {
  const words = promptText.trim().split(/\s+/).filter(w => w.length > 2);
  const name = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || 'Premium Product';
  const category = detectCategory(promptText);
  const priceRanges = { Grocery: [50, 500], Clothing: [500, 3000], Handicraft: [200, 2000], Electronics: [500, 5000], Other: [100, 1000] };
  const [min, max] = priceRanges[category] || priceRanges.Other;
  const price = Math.floor(Math.random() * (max - min) + min);

  return {
    name, category, suggestedPrice: price, language: 'English',
    description: `Quality ${name.toLowerCase()}. Great value for money.`,
    keywords: words.slice(0, 5), confidence: 0.7, source: 'local'
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { promptText, spokenLanguage = 'en' } = req.body;

    if (!promptText?.trim()) {
      return res.status(400).json({ error: 'Please describe your product' });
    }

    const inputLang = languageNames[spokenLanguage] || 'mixed Indian languages';

    if (hasApiKey()) {
      const systemPrompt = `You are an AI helping Indian sellers create product listings.
The user may speak in ${inputLang}, Hinglish, or mixed languages.
Respond ONLY with valid JSON:
{"name":"Product name","description":"2-3 sentence description","category":"Grocery/Clothing/Handicraft/Electronics/Other","suggestedPrice":number,"keywords":["keyword1","keyword2"]}`;

      const aiResponse = await callPerplexity(systemPrompt, `Create product listing: "${promptText}"`, 500);
      
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
        } catch {}
      }
    }

    res.json(generateFallback(promptText));
  } catch (error) {
    console.error('AI error:', error);
    res.status(500).json({ error: 'Failed to generate product details' });
  }
}
