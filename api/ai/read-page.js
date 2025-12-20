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
        max_tokens: 150,
        temperature: 0.5
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
    const { pageContent, pageName = 'page', language = 'en' } = req.body;

    if (!pageContent) {
      return res.status(400).json({ error: 'Page content required' });
    }

    const systemPrompt = `Summarize this page content in 1-2 sentences for a visually impaired user.
Page: ${pageName}
Language: ${language}
Be concise and helpful.`;

    const aiResponse = await callPerplexity(systemPrompt, pageContent.substring(0, 1500));
    
    if (aiResponse) {
      return res.json({ summary: aiResponse });
    }

    const defaultSummaries = {
      dashboard: 'This is your product dashboard showing all your catalog items.',
      home: 'This is the home page of the Digital Catalog app.',
      login: 'This is the login page. Enter your email and password to sign in.',
      signup: 'This is the signup page. Create an account to start your catalog.',
    };

    res.json({ summary: defaultSummaries[pageName] || `You are on the ${pageName} page.` });
  } catch (error) {
    console.error('Read page error:', error);
    res.status(500).json({ error: 'Failed to read page' });
  }
}
