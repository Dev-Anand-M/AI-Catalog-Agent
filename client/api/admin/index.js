import { db } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import {
  PROVIDER_REGISTRY,
  DEFAULT_PROVIDER_ORDER,
  loadAiConfig,
  saveAiConfig,
  isProviderConfigured,
  generateWithFallback
} from '../_lib/aiProviders.js';

function isAdminEmail(email) {
  const list = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(String(email || '').toLowerCase());
}

async function requireAdmin(handler) {
  return requireAuth(async (req, res) => {
    const user = await db.findUserById(req.userId);
    if (!user || (user.role !== 'admin' && !isAdminEmail(user.email))) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.userEmail = user.email;
    return handler(req, res);
  });
}

async function handler(req, res) {
  // ----- AI provider config -----
  if (req.query.resource === 'ai-providers') {
    if (req.method === 'GET') {
      const config = await loadAiConfig();
      const order = (Array.isArray(config?.providerOrder) && config.providerOrder.length > 0)
        ? config.providerOrder
        : DEFAULT_PROVIDER_ORDER;
      const providers = order
        .map(id => {
          const meta = PROVIDER_REGISTRY[id];
          if (!meta) return null;
          return {
            id,
            label: meta.label,
            defaultModel: meta.defaultModel,
            knownModels: meta.knownModels,
            envKeys: meta.envKeys,
            configured: isProviderConfigured(id),
            modelOverride: config?.providerModels?.[id] || null,
            disabled: !!(config?.disabledProviders || []).includes(id)
          };
        })
        .filter(Boolean);
      return res.json({
        providers,
        precedence: order,
        usingCustomPrecedence: !!(Array.isArray(config?.providerOrder) && config.providerOrder.length > 0)
      });
    }

    if (req.method === 'PUT') {
      const { providerOrder, providerModels, disabledProviders } = req.body || {};
      const patch = {};
      if (Array.isArray(providerOrder)) {
        const valid = providerOrder.filter(id => PROVIDER_REGISTRY[id]);
        const missing = DEFAULT_PROVIDER_ORDER.filter(id => !valid.includes(id));
        patch.providerOrder = [...valid, ...missing];
      }
      if (providerModels && typeof providerModels === 'object') {
        const clean = {};
        for (const [id, model] of Object.entries(providerModels)) {
          if (PROVIDER_REGISTRY[id] && typeof model === 'string' && model.trim()) {
            clean[id] = model.trim();
          }
        }
        patch.providerModels = clean;
      }
      if (Array.isArray(disabledProviders)) {
        patch.disabledProviders = disabledProviders.filter(id => PROVIDER_REGISTRY[id]);
      }
      const saved = await saveAiConfig(patch);
      await db.insertAuditLog({
        userId: req.userId,
        action: 'ADMIN_AI_CONFIG_UPDATE',
        entityType: 'AI',
        entityId: 'config',
        details: JSON.stringify({
          what: `Admin ${req.userEmail} updated AI provider configuration`,
          when: new Date().toISOString(),
          why: 'Manual admin change from the Admin portal',
          changed: patch
        }),
        createdAt: new Date().toISOString()
      });
      return res.json({ ok: true, config: saved });
    }

    if (req.method === 'POST' && req.query.action === 'custom-model') {
      const { providerId, modelName } = req.body || {};
      if (!providerId || !PROVIDER_REGISTRY[providerId]) {
        return res.status(400).json({ error: 'Invalid or missing providerId' });
      }
      if (!modelName || typeof modelName !== 'string' || !modelName.trim()) {
        return res.status(400).json({ error: 'Model name cannot be empty' });
      }
      const cleanModel = modelName.trim();
      const meta = PROVIDER_REGISTRY[providerId];
      const lowerModel = cleanModel.toLowerCase();

      const isDuplicate = meta.defaultModel.toLowerCase() === lowerModel ||
        (Array.isArray(meta.knownModels) && meta.knownModels.some(m => m.toLowerCase() === lowerModel));

      if (isDuplicate) {
        return res.status(400).json({
          error: `Model "${cleanModel}" already exists in the standard model list for ${meta.label}. Please select it directly from the dropdown list.`
        });
      }

      const currentConfig = await loadAiConfig();
      const currentModels = (currentConfig && currentConfig.providerModels) ? { ...currentConfig.providerModels } : {};
      currentModels[providerId] = cleanModel;
      const saved = await saveAiConfig({ providerModels: currentModels });
      await db.insertAuditLog({
        userId: req.userId,
        action: 'ADMIN_AI_CONFIG_UPDATE',
        entityType: 'AI',
        entityId: providerId,
        details: JSON.stringify({
          what: `Admin ${req.userEmail} set custom AI model for ${meta.label} to "${cleanModel}"`,
          when: new Date().toISOString(),
          why: 'Admin configured custom AI model name'
        }),
        createdAt: new Date().toISOString()
      });
      return res.json({ ok: true, providerId, model: cleanModel, config: saved });
    }

    if (req.method === 'POST' && req.query.action === 'test') {
      const result = await generateWithFallback({
        systemPrompt: 'You are a connection test. Reply with exactly: OK',
        userPrompt: 'Reply with exactly: OK',
        maxTokens: 10
      });
      return res.json({
        ok: !!result.text,
        provider: result.provider,
        model: result.model,
        reply: result.text,
        attempts: result.attempts
      });
    }
  }

  // ----- Platform stats -----
  if (req.query.resource === 'stats' && req.method === 'GET') {
    const users = (await (db.findAllUsers ? db.findAllUsers() : Promise.resolve([]))) || [];
    const products = (await (db.findAllProducts ? db.findAllProducts() : Promise.resolve([]))) || [];
    const sellers = users.filter(u => u.role !== 'admin');
    return res.json({
      sellers: sellers.length,
      products: (products || []).length,
      events: null,
      aiFallbacksByProvider: {}
    });
  }

  // ----- Seller oversight -----
  if (req.query.resource === 'sellers') {
    if (req.method === 'GET') {
      const users = (await (db.findAllUsers ? db.findAllUsers() : Promise.resolve([]))) || [];
      const products = (await (db.findAllProducts ? db.findAllProducts() : Promise.resolve([]))) || [];
      const sellers = users
        .filter(u => u.role !== 'admin')
        .map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          language: u.language || null,
          createdAt: u.createdAt || null,
          productCount: products.filter(p => String(p.userId) === String(u.id)).length,
          catalogValue: products
            .filter(p => String(p.userId) === String(u.id))
            .reduce((sum, p) => sum + (Number(p.price) || 0), 0)
        }))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return res.json(sellers);
    }

    if (req.method === 'DELETE' && req.query.id) {
      const target = await db.findUserById(req.query.id);
      if (!target) return res.status(404).json({ error: 'Seller not found' });
      if (target.role === 'admin') return res.status(403).json({ error: 'Cannot delete an admin' });
      await db.deleteUser(req.query.id);
      await db.insertAuditLog({
        userId: req.userId,
        action: 'ADMIN_DELETE_SELLER',
        entityType: 'USER',
        entityId: req.query.id,
        details: JSON.stringify({
          what: `Admin ${req.userEmail} deleted seller "${target.name}" (${target.email}) and all their products`,
          when: new Date().toISOString(),
          why: 'Manual admin action from the Admin portal'
        }),
        createdAt: new Date().toISOString()
      });
      return res.json({ ok: true });
    }
  }

  // ----- Platform-wide audit -----
  if (req.query.resource === 'audit' && req.method === 'GET') {
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
    const logs = (await (db.findAllAuditLogs ? db.findAllAuditLogs(limit) : Promise.resolve([]))) || [];
    const users = (await (db.findAllUsers ? db.findAllUsers() : Promise.resolve([]))) || [];
    const userMap = new Map(users.map(u => [String(u.id), u]));
    const enriched = logs.map(l => ({
      ...l,
      actorEmail: userMap.get(String(l.userId))?.email || null,
      actorName: userMap.get(String(l.userId))?.name || null
    }));
    return res.json(enriched);
  }

  res.status(404).json({ error: 'Unknown admin resource' });
}

export default requireAdmin(handler);
