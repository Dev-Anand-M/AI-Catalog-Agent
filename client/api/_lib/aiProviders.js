// Multi-provider AI engine for Vercel serverless — mirrors server/src/lib/aiProviders.js
// Admin-controlled precedence via DB config; env keys are the canonical secret source.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gzqqrgbwgqskgscpnqwr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY;

const headers = () => ({
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'return=representation'
});

const q = (table) => `${SUPABASE_URL}/rest/v1/${table}`;

export const PROVIDER_REGISTRY = {
  gemini: {
    label: 'Google Gemini',
    defaultModel: 'gemini-2.0-flash',
    knownModels: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    envKeys: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_AI_API_KEY'],
    kind: 'gemini'
  },
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    knownModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'],
    envKeys: ['OPENAI_API_KEY'],
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    kind: 'openai-compatible'
  },
  grok: {
    label: 'xAI Grok',
    defaultModel: 'grok-3-mini',
    knownModels: ['grok-3-mini', 'grok-3', 'grok-2-1212'],
    envKeys: ['GROK_API_KEY', 'XAI_API_KEY'],
    baseUrl: 'https://api.x.ai/v1/chat/completions',
    kind: 'openai-compatible'
  },
  sambanova: {
    label: 'SambaNova Cloud',
    defaultModel: 'Meta-Llama-3.3-70B-Instruct',
    knownModels: ['Meta-Llama-3.3-70B-Instruct', 'Llama-4-Maverick-17B-128E-Instruct', 'Meta-Llama-3.1-8B-Instruct'],
    envKeys: ['SAMBANOVA_API_KEY'],
    baseUrl: 'https://api.sambanova.ai/v1/chat/completions',
    kind: 'openai-compatible'
  },
  perplexity: {
    label: 'Perplexity',
    defaultModel: 'sonar-pro',
    knownModels: ['sonar-pro', 'sonar', 'sonar-reasoning'],
    envKeys: ['PERPLEXITY_API_KEY'],
    baseUrl: 'https://api.perplexity.ai/chat/completions',
    kind: 'openai-compatible'
  },
  groq: {
    label: 'Groq',
    defaultModel: 'qwen/qwen3.8-27b',
    knownModels: [
      'qwen/qwen3.8-27b',
      'groq/compound-mini',
      'groq/compound',
      'openai/gpt-oss-20b',
      'openai/gpt-oss-120b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ],
    envKeys: ['GROQ_API_KEY'],
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    kind: 'openai-compatible'
  },
  deepseek: {
    label: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    knownModels: ['deepseek-chat', 'deepseek-reasoner'],
    envKeys: ['DEEPSEEK_API_KEY'],
    baseUrl: 'https://api.deepseek.com/chat/completions',
    kind: 'openai-compatible'
  }
};

export const DEFAULT_PROVIDER_ORDER = [
  'gemini', 'openai', 'grok', 'sambanova', 'perplexity', 'groq', 'deepseek'
];

export async function loadAiConfig() {
  if (SUPABASE_KEY) {
    try {
      const res = await fetch(`${q('AiConfig')}?select=*&limit=1`, { headers: headers() });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows[0]) return rows[0];
      }
    } catch {
      // fall through
    }
  }
  return null;
}

export async function saveAiConfig(patch) {
  const current = (await loadAiConfig()) || {};
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  if (SUPABASE_KEY) {
    try {
      const res = await fetch(q('AiConfig'), {
        method: 'POST',
        headers: { ...headers(), 'Prefer': 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify(next)
      });
      if (res.ok) return next;
    } catch {
      // fall through
    }
  }
  return next;
}

export function resolveKey(providerId) {
  const meta = PROVIDER_REGISTRY[providerId];
  if (!meta) return null;
  for (const envName of meta.envKeys) {
    const val = process.env[envName];
    if (val && val.trim() && !val.includes('your-') && !val.includes('-here')) {
      return { key: val.trim(), envName };
    }
  }
  return null;
}

export function isProviderConfigured(providerId) {
  return !!resolveKey(providerId);
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

async function executeOpenAICompatible({ key, baseUrl, model, systemPrompt, userPrompt, maxTokens }) {
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });
  if (!res.ok) {
    let why = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      why = `HTTP ${res.status}: ${errBody?.error?.message || JSON.stringify(errBody).slice(0, 160)}`;
    } catch { /* keep status */ }
    throw new Error(why);
  }
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  const content = msg?.content || msg?.reasoning || null;
  if (!content) throw new Error('Empty response body from provider');
  return cleanAiResponse(content);
}

async function executeGemini({ key, model, systemPrompt, userPrompt, maxTokens }) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
      })
    }
  );
  if (!res.ok) {
    let why = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      why = `HTTP ${res.status}: ${errBody?.error?.message || JSON.stringify(errBody).slice(0, 160)}`;
    } catch { /* keep status */ }
    throw new Error(why);
  }
  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || null;
  if (!content) throw new Error('Empty candidates from Gemini');
  return cleanAiResponse(content);
}

export async function generateWithFallback({ systemPrompt, userPrompt, maxTokens = 500 }) {
  const config = await loadAiConfig();
  const order = (Array.isArray(config?.providerOrder) && config.providerOrder.length > 0)
    ? config.providerOrder
    : DEFAULT_PROVIDER_ORDER;
  const disabled = new Set(config?.disabledProviders || []);
  const candidates = order.filter(id => PROVIDER_REGISTRY[id] && !disabled.has(id));

  const attempts = [];
  for (const providerId of candidates) {
    const meta = PROVIDER_REGISTRY[providerId];
    const resolved = resolveKey(providerId);
    if (!resolved) {
      attempts.push({ provider: providerId, ok: false, why: 'No API key configured in environment' });
      continue;
    }
    const model = config?.providerModels?.[providerId] || meta.defaultModel;
    try {
      const params = { key: resolved.key, model, systemPrompt, userPrompt, maxTokens, baseUrl: meta.baseUrl };
      const text = meta.kind === 'gemini'
        ? await executeGemini(params)
        : await executeOpenAICompatible(params);
      attempts.push({ provider: providerId, model, ok: true });
      return { text, provider: providerId, model, attempts };
    } catch (err) {
      attempts.push({ provider: providerId, model, ok: false, why: err.message });
    }
  }
  return { text: null, provider: null, model: null, attempts };
}

// Precise WHAT/WHEN/WHY audit on fallback events
export async function auditAiRun({ userId, purpose, result, db, ip = null }) {
  try {
    const failures = result.attempts.filter(a => !a.ok);
    if (failures.length === 0) return; // first provider worked — silent

    const record = {
      userId: userId || null,
      action: result.provider ? 'AI_PROVIDER_FALLBACK' : 'AI_CHAIN_FAILED',
      entityType: 'AI',
      entityId: result.provider || 'none',
      details: JSON.stringify({
        what: result.provider
          ? `AI call for "${purpose}" fell back from ${failures[0].provider} to ${result.provider}`
          : `AI call for "${purpose}" failed on all ${result.attempts.length} configured providers`,
        when: new Date().toISOString(),
        why: failures.map(f => `${f.provider}${f.model ? ` (${f.model})` : ''}: ${f.why}`)
      }),
      ip,
      createdAt: new Date().toISOString()
    };
    if (db?.insertAuditLog) await db.insertAuditLog(record);
  } catch {
    // never break AI flow
  }
}
