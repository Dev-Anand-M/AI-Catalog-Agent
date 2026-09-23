import { db } from '../_lib/db.js';
import { requireAdmin } from '../_lib/adminGuard.js';
import {
  PROVIDER_REGISTRY,
  DEFAULT_PROVIDER_ORDER,
  loadAiConfig,
  saveAiConfig,
  isProviderConfigured,
  generateWithFallback
} from '../_lib/aiProviders.js';

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
  let pathname = url.pathname.replace(/^\/api/, '');

  const resource = req.query.resource || (
    pathname.startsWith('/admin/stats') ? 'stats' :
    pathname.startsWith('/admin/sellers') ? 'sellers' :
    pathname.startsWith('/admin/products') ? 'products' :
    pathname.startsWith('/admin/audit') ? 'audit' :
    (pathname.startsWith('/admin/ai-providers') || pathname.startsWith('/admin/ai-test')) ? 'ai-providers' :
    null
  );

  const action = req.query.action || (
    pathname === '/admin/ai-providers/custom-model' ? 'custom-model' :
    pathname === '/admin/ai-test' ? 'test' :
    null
  );

  // ----- Platform stats -----
  if (resource === 'stats') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    try {
      const [users, products, recentAudit, accessRequests] = await Promise.all([
        db.findAllUsers ? db.findAllUsers() : Promise.resolve([]),
        db.findAllProducts ? db.findAllProducts() : Promise.resolve([]),
        db.findAllAuditLogs ? db.findAllAuditLogs(500) : Promise.resolve([]),
        db.findAccessRequests ? db.findAccessRequests('all') : Promise.resolve([])
      ]);
      const sellers = (users || []).filter(u => u.role !== 'admin');
      const byProvider = {};
      for (const log of (recentAudit || [])) {
        if (log.action === 'AI_PROVIDER_FALLBACK' || log.action === 'AI_CHAIN_FAILED') {
          byProvider[log.entityId || 'unknown'] = (byProvider[log.entityId || 'unknown'] || 0) + 1;
        }
      }
      return res.json({
        sellers: sellers.length,
        products: (products || []).length,
        events: (recentAudit || []).length,
        pendingAccessRequests: (accessRequests || []).filter(r => r.status === 'pending').length,
        aiFallbacksByProvider: byProvider
      });
    } catch (err) {
      console.error('Admin stats error:', err);
      return res.status(500).json({ error: 'Failed to load platform stats' });
    }
  }

  // ----- Seller oversight -----
  if (resource === 'sellers') {
    if (req.method === 'GET') {
      try {
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
      } catch (err) {
        console.error('Admin sellers error:', err);
        return res.status(500).json({ error: 'Failed to load sellers' });
      }
    }

    const sellerId = req.query.id || (pathname.startsWith('/admin/sellers/') ? pathname.split('/')[3] : null);
    if (req.method === 'DELETE' && sellerId) {
      try {
        const target = await db.findUserById(sellerId);
        if (!target) return res.status(404).json({ error: 'Seller not found' });
        if (target.role === 'admin') return res.status(403).json({ error: 'Cannot delete an admin' });
        await db.deleteUser(sellerId);
        if (db.insertAuditLog) {
          await db.insertAuditLog({
            userId: req.userId,
            action: 'ADMIN_DELETE_SELLER',
            entityType: 'USER',
            entityId: sellerId,
            details: JSON.stringify({
              what: `Admin ${req.userEmail} deleted seller "${target.name}" (${target.email}) and all their products`,
              when: new Date().toISOString(),
              why: 'Manual admin action from the Admin portal'
            }),
            createdAt: new Date().toISOString()
          });
        }
        return res.json({ ok: true });
      } catch (err) {
        console.error('Admin delete seller error:', err);
        return res.status(500).json({ error: 'Failed to delete seller' });
      }
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ----- Platform catalog oversight -----
  if (resource === 'products') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    try {
      const [products, users] = await Promise.all([
        db.findAllProducts ? db.findAllProducts() : Promise.resolve([]),
        db.findAllUsers ? db.findAllUsers() : Promise.resolve([])
      ]);
      const sellerById = new Map((users || []).map(u => [String(u.id), u]));
      return res.json((products || []).map(p => {
        const seller = sellerById.get(String(p.userId)) || null;
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          category: p.category,
          price: p.price,
          imageUrl: p.imageUrl || null,
          shopifyUrl: p.shopifyUrl || null,
          confirmationState: p.confirmationState || 'seller_confirmed',
          createdAt: p.createdAt || null,
          sellerId: p.userId ?? null,
          sellerName: seller?.name || null,
          sellerEmail: seller?.email || null
        };
      }));
    } catch (err) {
      console.error('Admin products error:', err);
      return res.status(500).json({ error: 'Failed to load the platform catalog' });
    }
  }

  // ----- Platform-wide audit -----
  if (resource === 'audit') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    try {
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
    } catch (err) {
      console.error('Admin audit error:', err);
      return res.status(500).json({ error: 'Failed to load platform audit log' });
    }
  }

  // ----- AI provider config & testing -----
  if (resource === 'ai-providers') {
    if (req.method === 'GET') {
      try {
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
      } catch (err) {
        console.error('Admin AI providers GET error:', err);
        return res.status(500).json({ error: 'Failed to load AI provider config' });
      }
    }

    if (req.method === 'PUT') {
      try {
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
        if (db.insertAuditLog) {
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
        }
        return res.json({ ok: true, config: saved });
      } catch (err) {
        console.error('Admin AI config update error:', err);
        return res.status(500).json({ error: 'Failed to save AI provider config' });
      }
    }

    if (req.method === 'POST' && action === 'custom-model') {
      try {
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
        if (db.insertAuditLog) {
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
        }
        return res.json({ ok: true, providerId, model: cleanModel, config: saved });
      } catch (err) {
        console.error('Admin custom model error:', err);
        return res.status(500).json({ error: 'Failed to configure custom model' });
      }
    }

    if (req.method === 'POST' && (action === 'test' || pathname === '/admin/ai-test')) {
      try {
        const result = await generateWithFallback({
          systemPrompt: 'You are a connection test. Reply with exactly: OK',
          userPrompt: 'Reply with exactly: OK',
          maxTokens: 10,
          auditContext: 'admin-connectivity-test'
        });
        return res.json({
          ok: !!result.text,
          provider: result.provider,
          model: result.model,
          reply: result.text,
          attempts: result.attempts
        });
      } catch (err) {
        console.error('Admin AI test error:', err);
        return res.status(500).json({ error: 'AI test failed' });
      }
    }
  }

  return res.status(404).json({ error: 'Unknown admin resource' });
}

export default requireAdmin(handler);
