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
        max_tokens: 100,
        temperature: 0.3
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
    const { transcript, language = 'en' } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript required' });
    }

    const systemPrompt = `You are a voice command interpreter for a product catalog app.
Map user speech to one of these actions: dashboard, addProduct, export, payment, home, login, logout, demo, help, readPage
Respond ONLY with JSON: {"action":"actionName","confidence":0.0-1.0}
If unclear, use {"action":"unknown","confidence":0.0}`;

    const aiResponse = await callPerplexity(systemPrompt, `Interpret: "${transcript}"`);
    
    if (aiResponse) {
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json({
            action: parsed.action || 'unknown',
            confidence: parsed.confidence || 0.5
          });
        }
      } catch {}
    }

    res.json({ action: 'unknown', confidence: 0 });
  } catch (error) {
    console.error('Interpret error:', error);
    res.status(500).json({ error: 'Failed to interpret command' });
  }
}
