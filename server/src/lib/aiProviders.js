// Multi-provider AI engine with automatic fallback precedence.
//
// Providers are tried in a configured order (admin-controlled via DB config,
// falling back to env-key availability). Every failed attempt is recorded to
// the audit trail with WHAT failed, WHEN, and WHY (status/error), so admins
// can diagnose provider outages from the Activity Log.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gzqqrgbwgqskgscpnqwr.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY;
const fs = require('fs');
const path = require('path');

const headers = () => ({
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'return=representation'
});

const q = (table) => `${SUPABASE_URL}/rest/v1/${table}`;
const isTestEnv = process.env.NODE_ENV === 'test';
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

// Sensible precedence: Gemini first (best price/perf for Indic languages),
// then OpenAI, Grok, SambaNova, Perplexity, Groq, DeepSeek.
const DEFAULT_PROVIDER_ORDER = [
  'groq',
  'gemini',
  'openai',
  'grok',
  'sambanova',
  'perplexity',
  'deepseek'
];

const PROVIDER_REGISTRY = {
  gemini: {
    label: 'Google Gemini',
    defaultModel: 'gemini-2.0-flash',
    knownModels: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    envKeys: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_AI_API_KEY'],
    // Gemini uses a non-OpenAI wire format → custom executor
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

// ---------------------------------------------------------------------------
// Config store (DB `AiConfig` single-row table, local JSON fallback)
// ---------------------------------------------------------------------------

function readLocalConfig() {
  try {
    if (!fs.existsSync(DB_FILE)) return null;
    const local = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    return local.aiConfig || null;
  } catch {
    return null;
  }
}

function writeLocalConfig(config) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const local = fs.existsSync(DB_FILE)
      ? JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
      : {};
    local.aiConfig = config;
    fs.writeFileSync(DB_FILE, JSON.stringify(local, null, 2));
  } catch (err) {
    console.error('AI config local write failed:', err.message);
  }
}

async function loadAiConfig() {
  if (!isTestEnv && SUPABASE_KEY) {
    try {
      const res = await fetch(`${q('AiConfig')}?select=*&limit=1`, {
        headers: headers(),
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows[0]) return rows[0];
      }
    } catch {
      // fall through to local
    }
  }
  return readLocalConfig();
}

async function saveAiConfig(patch) {
  const current = (await loadAiConfig()) || {};
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };

  if (!isTestEnv && SUPABASE_KEY) {
    try {
      const res = await fetch(q('AiConfig'), {
        method: 'POST',
        headers: { ...headers(), 'Prefer': 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify(next),
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) return next;
    } catch {
      // fall through to local
    }
  }
  writeLocalConfig(next);
  return next;
}

// ---------------------------------------------------------------------------
// Key resolution: DB override → env vars (with live disk .env fallback)
// ---------------------------------------------------------------------------

function getEnvValue(envName) {
  const direct = process.env[envName];
  if (direct && direct.trim() && !direct.includes('your-') && !direct.includes('-here')) {
    return direct.trim();
  }
  // Dynamic fallback to disk .env files in case server process hasn't restarted
  try {
    const candidates = [
      path.join(__dirname, '../.env'),
      path.join(__dirname, '../../.env'),
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), 'server/.env')
    ];
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        const text = fs.readFileSync(filePath, 'utf-8');
        const match = text.match(new RegExp(`^\\s*${envName}\\s*=\\s*["']?([^"'\\r\\n]+)["']?`, 'm'));
        if (match && match[1]) {
          const val = match[1].trim();
          if (val && !val.includes('your-') && !val.includes('-here')) {
            process.env[envName] = val; // populate in process.env for subsequent reads
            return val;
          }
        }
      }
    }
  } catch {
    // ignore read errors
  }
  return null;
}

function resolveKey(providerId, config) {
  const meta = PROVIDER_REGISTRY[providerId];
  if (!meta) return null;
  // Admin-set key override stored in DB (already expected to be an env-backed
  // name reference or literal); env vars are the canonical source.
  for (const envName of meta.envKeys) {
    const val = getEnvValue(envName);
    if (val) {
      return { key: val, envName };
    }
  }
  return null;
}

function isProviderConfigured(providerId, config) {
  return !!resolveKey(providerId, config);
}

// ---------------------------------------------------------------------------
// Executors
// ---------------------------------------------------------------------------

function cleanAiResponse(text) {
  if (!text) return text;
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/<\/?think>/gi, '');
  cleaned = cleaned.replace(/\[\d+\]/g, '');
  cleaned = cleaned.replace(/\*\*/g, '').replace(/\*/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned.trim();
}

async function executeOpenAICompatible({ key, baseUrl, model, systemPrompt, userPrompt, maxTokens, providerId }) {
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    }),
    signal: AbortSignal.timeout(20000)
  });

  if (!res.ok) {
    let why = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      why = `HTTP ${res.status}: ${errBody?.error?.message || JSON.stringify(errBody).slice(0, 160)}`;
    } catch { /* keep status-only reason */ }
    const err = new Error(why);
    err.status = res.status;
    throw err;
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
      }),
      signal: AbortSignal.timeout(20000)
    }
  );

  if (!res.ok) {
    let why = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      why = `HTTP ${res.status}: ${errBody?.error?.message || JSON.stringify(errBody).slice(0, 160)}`;
    } catch { /* keep status-only reason */ }
    const err = new Error(why);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || null;
  if (!content) throw new Error('Empty candidates from Gemini');
  return cleanAiResponse(content);
}

// ---------------------------------------------------------------------------
// Fallback chain executor
// ---------------------------------------------------------------------------

/**
 * Try each configured provider in precedence order until one succeeds.
 * @returns {{ text: string, provider: string, model: string, attempts: Array }}
 *   or { text: null, provider: null, attempts } when everything failed.
 */
async function generateWithFallback({ systemPrompt, userPrompt, maxTokens = 500, userId = null, auditContext = 'ai' }) {
  const config = await loadAiConfig();
  const customOrder = Array.isArray(config?.providerOrder) && config.providerOrder.length > 0
    ? config.providerOrder
    : null;
  const order = customOrder || DEFAULT_PROVIDER_ORDER;

  // Optional provider disable list from admin config
  const disabled = new Set(config?.disabledProviders || []);
  const candidates = order.filter(id => PROVIDER_REGISTRY[id] && !disabled.has(id));

  const attempts = [];

  for (const providerId of candidates) {
    const meta = PROVIDER_REGISTRY[providerId];
    const resolved = resolveKey(providerId, config);

    if (!resolved) {
      attempts.push({ provider: providerId, ok: false, why: 'No API key configured in environment' });
      continue;
    }

    // Admin per-provider model override, else provider default
    const model = config?.providerModels?.[providerId] || meta.defaultModel;

    const startedAt = new Date().toISOString();
    try {
      const params = {
        key: resolved.key,
        model,
        systemPrompt,
        userPrompt,
        maxTokens,
        providerId,
        baseUrl: meta.baseUrl
      };
      const text = meta.kind === 'gemini'
        ? await executeGemini(params)
        : await executeOpenAICompatible(params);

      attempts.push({ provider: providerId, model, ok: true, startedAt, finishedAt: new Date().toISOString() });
      return { text, provider: providerId, model, attempts };
    } catch (err) {
      attempts.push({
        provider: providerId,
        model,
        ok: false,
        why: err.message,
        status: err.status || null,
        startedAt,
        finishedAt: new Date().toISOString()
      });
      // continue to next provider in the chain
    }
  }

  return { text: null, provider: null, model: null, attempts };
}

/**
 * Audit helper — records precise WHAT/WHEN/WHY for every AI chain run.
 * Fired only when something noteworthy happened (a provider failed and we
 * fell back, or the whole chain failed). Successful first-try calls are silent
 * to avoid log spam.
 */
async function auditAiRun({ userId, purpose, result, ip = null }) {
  try {
    const { logAudit } = require('./audit');
    const failures = (result?.attempts || []).filter(a => !a.ok);
    const succeededOn = result?.provider;
    const action = !succeededOn
      ? 'AI_CHAIN_FAILED'
      : (failures.length > 0 ? 'AI_PROVIDER_FALLBACK' : 'AI_RUN');

    await logAudit({
      userId,
      action,
      entityType: 'AI',
      entityId: succeededOn || 'none',
      details: {
        what: succeededOn
          ? `AI call for "${purpose || 'ai'}" completed using ${succeededOn} (${result.model || 'default'})`
          : `AI call for "${purpose || 'ai'}" failed on all ${result?.attempts?.length || 0} configured providers`,
        provider: succeededOn || null,
        model: result?.model || null,
        when: new Date().toISOString(),
        why: failures.length > 0
          ? failures.map(f => `${f.provider} (${f.model || 'default'}): ${f.why}`)
          : ['Provider executed successfully'],
        attempts: (result?.attempts || []).map(a => ({
          provider: a.provider,
          model: a.model || null,
          ok: a.ok,
          why: a.why || null
        }))
      },
      ip
    });
  } catch {
    // audit must never break AI responses
  }
}

module.exports = {
  PROVIDER_REGISTRY,
  DEFAULT_PROVIDER_ORDER,
  loadAiConfig,
  saveAiConfig,
  resolveKey,
  isProviderConfigured,
  generateWithFallback,
  auditAiRun,
  cleanAiResponse
};
