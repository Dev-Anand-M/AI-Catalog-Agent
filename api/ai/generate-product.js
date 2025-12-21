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

function generateFallback(promptText, language = 'en') {
  const words = promptText.trim().split(/\s+/).filter(w => w.length > 2);
  const name = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || promptText || 'Premium Product';
  const category = detectCategory(promptText);
  const priceRanges = { Grocery: [50, 500], Clothing: [500, 3000], Handicraft: [200, 2000], Electronics: [500, 5000], Other: [100, 1000] };
  const [min, max] = priceRanges[category] || priceRanges.Other;
  const price = Math.floor(Math.random() * (max - min) + min);

  // Fallback descriptions that include the product name
  const fallbackDescs = {
    ta: `${promptText} - தரமான பொருள். எங்கள் கடையில் சிறந்த விலையில் கிடைக்கும்.`,
    hi: `${promptText} - उच्च गुणवत्ता वाला उत्पाद। हमारी दुकान में सर्वोत्तम मूल्य पर उपलब्ध।`,
    te: `${promptText} - నాణ్యమైన ఉత్పత్తి. మా షాపులో ఉత్తమ ధరలో లభిస్తుంది.`,
    kn: `${promptText} - ಗುಣಮಟ್ಟದ ಉತ್ಪನ್ನ. ನಮ್ಮ ಅಂಗಡಿಯಲ್ಲಿ ಉತ್ತಮ ಬೆಲೆಯಲ್ಲಿ ಲಭ್ಯವಿದೆ.`,
    bn: `${promptText} - উচ্চ মানের পণ্য। আমাদের দোকানে সেরা দামে পাওয়া যায়।`,
    en: `${promptText} - Quality product available at our store at the best price.`
  };

  return {
    name: promptText || name, 
    category, 
    suggestedPrice: price, 
    language: languageNames[language] || 'English',
    description: fallbackDescs[language] || fallbackDescs.en,
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
    const outputLang = languageNames[spokenLanguage] || 'English';

    if (hasApiKey()) {
      const systemPrompt = `You are a product catalog assistant for Indian retail stores.
The user describes a product - it may be in ANY language (Tamil, Hindi, Telugu, Kannada, Bengali, English, or mixed like Hinglish/Tanglish).

YOUR TASK:
1. UNDERSTAND what product they are describing (even if in Tamil script like "உளுத்தம் பருப்பு" or Hindi "चावल")
2. Generate a SPECIFIC description about THAT product in ${outputLang}
3. The description MUST be about the actual product mentioned, NOT a generic description

EXAMPLES:
- Input: "உளுத்தம் பருப்பு" (Tamil for Urad Dal) → Description should be about urad dal specifically
- Input: "basmati rice 5kg bag" → Description should be about basmati rice
- Input: "சிவப்பு அரிசி" (Tamil for Red Rice) → Description should be about red rice
- Input: "हल्दी पाउडर" (Hindi for Turmeric Powder) → Description should be about turmeric

CRITICAL: Write the description in ${outputLang}. Make it specific to the product, not generic.

Respond ONLY with valid JSON:
{"name":"Product name in ${outputLang}","description":"2-3 sentences about THIS specific product in ${outputLang}","category":"Grocery/Clothing/Handicraft/Electronics/Other","suggestedPrice":number,"keywords":["keyword1","keyword2"]}`;

      const aiResponse = await callPerplexity(systemPrompt, `Product: "${promptText}"`, 500);
      
      if (aiResponse) {
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            // Check description is not empty/generic
            if (parsed.description && parsed.description.length > 15) {
              return res.json({
                name: parsed.name || promptText,
                description: parsed.description,
                category: parsed.category || detectCategory(promptText),
                suggestedPrice: parsed.suggestedPrice || 500,
                language: outputLang,
                keywords: parsed.keywords || [],
                confidence: 0.95,
                source: 'perplexity'
              });
            }
          }
        } catch {}
      }
    }

    res.json(generateFallback(promptText, spokenLanguage));
  } catch (error) {
    console.error('AI error:', error);
    res.status(500).json({ error: 'Failed to generate product details' });
  }
}
