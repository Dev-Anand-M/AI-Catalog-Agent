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
        max_tokens: 60,
        temperature: 0.7
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';
    // Aggressively remove all markdown and formatting
    content = content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold** -> bold
      .replace(/\*([^*]+)\*/g, '$1')       // *italic* -> italic
      .replace(/\*/g, '')                   // any remaining asterisks
      .replace(/__([^_]+)__/g, '$1')       // __bold__ -> bold
      .replace(/_([^_]+)_/g, '$1')         // _italic_ -> italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) -> text
      .replace(/#{1,6}\s*/g, '')           // # headers
      .replace(/`([^`]+)`/g, '$1')         // `code` -> code
      .replace(/^[\s]*[-•]\s*/gm, '')      // bullet points at start of lines
      .replace(/\n+/g, ' ')                // newlines to spaces
      .replace(/\s+/g, ' ')                // multiple spaces to single
      .trim();
    return content;
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

    const systemPrompt = `You are a voice assistant for a digital catalog app.
Page: ${context}

STRICT RULES:
- Maximum 2 sentences
- NO markdown, NO asterisks, NO bullet points, NO lists
- Plain conversational text only
- Be brief and direct`;

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
