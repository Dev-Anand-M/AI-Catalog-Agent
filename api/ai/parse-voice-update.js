const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

function hasApiKey() {
  const key = process.env.PERPLEXITY_API_KEY;
  return key && key !== 'your-perplexity-api-key-here' && key.startsWith('pplx-');
}

async function callPerplexity(systemPrompt, userPrompt) {
  if (!hasApiKey()) return null;

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transcript, currentProduct, language = 'en' } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript required' });
    }

    if (hasApiKey()) {
      const systemPrompt = `Parse voice command to update product fields.
Current product: ${JSON.stringify(currentProduct || {})}
Respond ONLY with JSON:
{"action":"update","field":"name/description/category/price","value":"new value","confidence":0.0-1.0}
Examples:
- "update price to 500" → {"action":"update","field":"price","value":500,"confidence":0.95}
- "change category to clothing" → {"action":"update","field":"category","value":"Clothing","confidence":0.95}`;

      const aiResponse = await callPerplexity(systemPrompt, `Parse: "${transcript}"`);
      
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
        } catch {}
      }
    }

    // Fallback pattern matching
    const text = transcript.toLowerCase();
    let result = { action: 'unknown', field: null, value: null, confidence: 0.3 };

    const priceMatch = text.match(/price\s*(?:to|=|:)?\s*(\d+)/i) || text.match(/(\d+)\s*(?:rupees?|rs)/i);
    if (priceMatch) {
      result = { action: 'update', field: 'price', value: parseInt(priceMatch[1]), confidence: 0.8 };
    }

    const categoryMatch = text.match(/category\s*(?:to|=|:)?\s*(grocery|clothing|handicraft|electronics|other)/i);
    if (categoryMatch) {
      result = { action: 'update', field: 'category', value: categoryMatch[1].charAt(0).toUpperCase() + categoryMatch[1].slice(1), confidence: 0.8 };
    }

    res.json({ transcript, ...result, source: 'local' });
  } catch (error) {
    console.error('Voice parse error:', error);
    res.status(500).json({ error: 'Failed to parse voice command' });
  }
}
