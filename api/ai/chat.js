const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

async function callPerplexity(systemPrompt, userPrompt) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key || !key.startsWith('pplx-')) return null;

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
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
    const { message, context = '', language = 'en' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const systemPrompt = `You are a helpful assistant for a digital product catalog app for Indian retailers.
Current page: ${context}
Language preference: ${language}
Keep responses brief (1-2 sentences). Be helpful and friendly.`;

    const aiResponse = await callPerplexity(systemPrompt, message);
    
    if (aiResponse) {
      return res.json({ response: aiResponse });
    }

    res.json({ response: "I'm here to help with your catalog. Try asking about products, navigation, or features." });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
}
