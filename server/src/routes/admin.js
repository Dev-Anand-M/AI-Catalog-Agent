const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAdmin, isAdminUser } = require('../middleware/admin');
const { logAudit, getAuditLogs, getAllAuditLogs } = require('../lib/audit');
const { provisionAccountFromRequest } = require('../lib/provisioning');
const {
  PROVIDER_REGISTRY,
  DEFAULT_PROVIDER_ORDER,
  loadAiConfig,
  saveAiConfig,
  isProviderConfigured,
  generateWithFallback,
  auditAiRun
} = require('../lib/aiProviders');

const router = express.Router();

// ---------------------------------------------------------------------------
// Platform stats (sellers, products, activity volume)
// ---------------------------------------------------------------------------

// GET /api/admin/stats — platform-wide counts for the admin overview
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // `getAuditLogs` is per-user: passing '*' filtered on a literal userId and
    // always came back empty, so the overview claimed "0 audit events" while the
    // Activity Log showed hundreds. Platform stats need the unfiltered trail.
    const [users, products, recentAudit, accessRequests] = await Promise.all([
      db.findAllUsers ? db.findAllUsers() : [],
      db.findAllProducts(),
      getAllAuditLogs(500).catch(() => []),
      db.findAccessRequests('all').catch(() => [])
    ]);

    const sellers = (users || []).filter(u => u.role !== 'admin');
    const byProvider = {};
    for (const log of recentAudit) {
      if (log.action === 'AI_PROVIDER_FALLBACK' || log.action === 'AI_CHAIN_FAILED') {
        byProvider[log.entityId || 'unknown'] = (byProvider[log.entityId || 'unknown'] || 0) + 1;
      }
    }

    res.json({
      sellers: sellers.length,
      products: (products || []).length,
      events: recentAudit.length,
      pendingAccessRequests: (accessRequests || []).filter(r => r.status === 'pending').length,
      aiFallbacksByProvider: byProvider
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to load platform stats' });
  }
});

// ---------------------------------------------------------------------------
// Seller oversight
// ---------------------------------------------------------------------------

// GET /api/admin/sellers — all sellers with product counts
router.get('/sellers', requireAdmin, async (req, res) => {
  try {
    const users = (await (db.findAllUsers ? db.findAllUsers() : [])) || [];
    const products = (await db.findAllProducts()) || [];

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

    res.json(sellers);
  } catch (error) {
    console.error('Admin sellers error:', error);
    res.status(500).json({ error: 'Failed to load sellers' });
  }
});

// GET /api/admin/products — the whole platform catalog, read-only.
//
// `/api/products` is deliberately scoped to the caller, so an administrator — who
// owns nothing — used to get an empty list while the UI described it as a view
// "across merchants". Oversight needs the real thing, with each row attributed to
// its seller so the console can link back to the storefront that published it.
router.get('/products', requireAdmin, async (req, res) => {
  try {
    const [products, users] = await Promise.all([
      db.findAllProducts(),
      db.findAllUsers ? db.findAllUsers() : []
    ]);

    const sellerById = new Map((users || []).map(u => [String(u.id), u]));

    res.json((products || []).map(p => {
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
  } catch (error) {
    console.error('Admin products error:', error);
    res.status(500).json({ error: 'Failed to load the platform catalog' });
  }
});

// DELETE /api/admin/sellers/:id — remove a seller and their catalog
router.delete('/sellers/:id', requireAdmin, async (req, res) => {
  try {
    const target = await db.findUserById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Seller not found' });
    if (target.role === 'admin') return res.status(403).json({ error: 'Cannot delete an admin' });

    await db.deleteUser(req.params.id);

    await logAudit({
      userId: req.userId,
      action: 'ADMIN_DELETE_SELLER',
      entityType: 'USER',
      entityId: req.params.id,
      details: {
        what: `Admin ${req.userEmail || req.userId} deleted seller "${target.name}" (${target.email}) and all their products`,
        when: new Date().toISOString(),
        why: 'Manual admin action from the Admin portal'
      }
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Admin delete seller error:', error);
    res.status(500).json({ error: 'Failed to delete seller' });
  }
});

// ---------------------------------------------------------------------------
// Access requests — the only way new merchants join the platform
// ---------------------------------------------------------------------------

// GET /api/admin/access-requests?status=pending — the review queue
router.get('/access-requests', requireAdmin, async (req, res) => {
  try {
    const status = req.query.status || 'all';
    const requests = (await db.findAccessRequests(status)) || [];
    const counts = requests.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});
    res.json({ requests, counts });
  } catch (error) {
    console.error('Admin access-requests error:', error);
    res.status(500).json({ error: 'Could not load access requests' });
  }
});

// PATCH /api/admin/access-requests — update review note or status
router.patch('/access-requests', requireAdmin, async (req, res) => {
  try {
    const { id, status, reviewNote } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Request id is required' });

    const updateData = {};
    if (status) updateData.status = status;
    if (reviewNote !== undefined) updateData.reviewNote = reviewNote;
    updateData.reviewedAt = new Date().toISOString();
    updateData.reviewedBy = req.userEmail || String(req.userId);

    const updated = await db.updateAccessRequest(id, updateData);
    res.json({ ok: true, request: updated });
  } catch (error) {
    console.error('Admin update access-request error:', error);
    res.status(500).json({ error: 'Failed to update access request' });
  }
});

// POST /api/admin/access-requests/:id/approve — provision the merchant's account
router.post('/access-requests/:id/approve', requireAdmin, async (req, res) => {
  try {
    const request = await db.findAccessRequestById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Access request not found' });

    // Handle password reset approval
    if (request.source === 'password_reset') {
      const existingUser = (request.provisionedUserId ? await db.findUserById(request.provisionedUserId) : null)
        || (request.email ? await db.findUserByEmail(request.email) : null)
        || (request.phone ? await db.findUserByPhone(request.phone) : null);

      if (!existingUser) {
        return res.status(404).json({ error: 'Matching user account for password reset was not found' });
      }

      const temporaryPassword = 'Seller' + Math.floor(1000 + Math.random() * 9000);
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);

      await db.updateUser(existingUser.id, {
        passwordHash,
        mustChangePassword: true
      });

      await db.updateAccessRequest(request.id, {
        status: 'approved',
        reviewedBy: req.userEmail || String(req.userId),
        reviewedAt: new Date().toISOString()
      });

      await logAudit({
        userId: req.userId,
        action: 'PASSWORD_RESET_APPROVED',
        entityType: 'USER',
        entityId: existingUser.id,
        details: {
          what: `Admin ${req.userEmail || req.userId} approved password reset for "${existingUser.name}" (${existingUser.email || existingUser.phone})`,
          when: new Date().toISOString()
        }
      });

      return res.status(200).json({
        ok: true,
        user: { id: existingUser.id, name: existingUser.name, email: existingUser.email, phone: existingUser.phone, role: existingUser.role },
        credentials: {
          identifier: existingUser.email || existingUser.phone,
          temporaryPassword,
          mustChangePassword: true
        },
        message: `Temporary password generated for ${existingUser.name}. Share it with them via WhatsApp or Email.`
      });
    }

    const { user, temporaryPassword } = await provisionAccountFromRequest(request, req.body || {});

    await db.updateAccessRequest(request.id, {
      status: 'approved',
      reviewedBy: req.userEmail || String(req.userId),
      reviewedAt: new Date().toISOString(),
      provisionedUserId: user.id
    });

    await logAudit({
      userId: req.userId,
      action: 'ACCESS_REQUEST_APPROVE',
      entityType: 'ACCESS_REQUEST',
      entityId: request.id,
      details: {
        what: `Admin ${req.userEmail || req.userId} approved "${request.businessName || request.name}" and created store account #${user.id}`,
        when: new Date().toISOString(),
        why: 'Approved from the Admin portal'
      }
    });

    // The temporary password is returned exactly once — it is never stored in plain text.
    res.status(201).json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email || null, phone: user.phone || null, role: user.role || 'user' },
      credentials: {
        identifier: user.email || user.phone,
        temporaryPassword,
        mustChangePassword: true
      },
      message: `Account created for ${user.name}. Share the temporary password with them once — it will not be shown again.`
    });
  } catch (error) {
    console.error('Admin approve access-request error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Could not create the account' });
  }
});

// POST /api/admin/access-requests/:id/reject
router.post('/access-requests/:id/reject', requireAdmin, async (req, res) => {
  try {
    const request = await db.findAccessRequestById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Access request not found' });
    if (request.status === 'approved') {
      return res.status(409).json({ error: 'This request was already approved — an account exists for it.' });
    }

    const reason = String(req.body?.reason || '').trim().slice(0, 500) || null;

    await db.updateAccessRequest(request.id, {
      status: 'rejected',
      reviewedBy: req.userEmail || String(req.userId),
      reviewedAt: new Date().toISOString(),
      reviewNote: reason
    });

    await logAudit({
      userId: req.userId,
      action: 'ACCESS_REQUEST_REJECT',
      entityType: 'ACCESS_REQUEST',
      entityId: request.id,
      details: {
        what: `Admin ${req.userEmail || req.userId} declined "${request.businessName || request.name}"`,
        when: new Date().toISOString(),
        why: reason
      }
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('Admin reject access-request error:', error);
    res.status(500).json({ error: error.message || 'Could not decline the request' });
  }
});

// ---------------------------------------------------------------------------
// Platform-wide audit (admin sees everything, sellers see their own)
// ---------------------------------------------------------------------------

// GET /api/admin/audit — all users' audit trail with actor emails
router.get('/audit', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
    const { getAllAuditLogs } = require('../lib/audit');
    const logs = await getAllAuditLogs(limit);

    // Enrich with actor email for precise "who did what"
    const users = (await (db.findAllUsers ? db.findAllUsers() : [])) || [];
    const userMap = new Map(users.map(u => [String(u.id), u]));
    const enriched = logs.map(l => ({
      ...l,
      actorEmail: userMap.get(String(l.userId))?.email || null,
      actorName: userMap.get(String(l.userId))?.name || null
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Admin audit error:', error);
    res.status(500).json({ error: 'Failed to load platform audit log' });
  }
});

// ---------------------------------------------------------------------------
// AI provider management
// ---------------------------------------------------------------------------

// GET /api/admin/ai-providers — registry + current config + availability
router.get('/ai-providers', requireAdmin, async (req, res) => {
  try {
    const config = await loadAiConfig();
    const order = (Array.isArray(config?.providerOrder) && config.providerOrder.length > 0)
      ? config.providerOrder
      : DEFAULT_PROVIDER_ORDER;

    const providers = order.map(id => {
      const meta = PROVIDER_REGISTRY[id];
      if (!meta) return null;
      return {
        id,
        label: meta.label,
        defaultModel: meta.defaultModel,
        knownModels: meta.knownModels,
        envKeys: meta.envKeys,
        configured: isProviderConfigured(id, config),
        modelOverride: config?.providerModels?.[id] || null,
        disabled: !!(config?.disabledProviders || []).includes(id)
      };
    }).filter(Boolean);

    res.json({
      providers,
      precedence: order,
      usingCustomPrecedence: !!(Array.isArray(config?.providerOrder) && config.providerOrder.length > 0)
    });
  } catch (error) {
    console.error('Admin AI providers error:', error);
    res.status(500).json({ error: 'Failed to load AI provider config' });
  }
});

// PUT /api/admin/ai-providers — update precedence, model overrides, disabled list
router.put('/ai-providers', requireAdmin, async (req, res) => {
  try {
    const { providerOrder, providerModels, disabledProviders } = req.body || {};

    const patch = {};
    if (Array.isArray(providerOrder)) {
      const valid = providerOrder.filter(id => PROVIDER_REGISTRY[id]);
      // Keep any unlisted providers at the end so the chain stays complete
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

    await logAudit({
      userId: req.userId,
      action: 'ADMIN_AI_CONFIG_UPDATE',
      entityType: 'AI',
      entityId: 'config',
      details: {
        what: `Admin ${req.userEmail || req.userId} updated AI provider configuration`,
        when: new Date().toISOString(),
        why: 'Manual admin change from the Admin portal',
        changed: patch
      }
    });

    res.json({ ok: true, config: saved });
  } catch (error) {
    console.error('Admin AI config update error:', error);
    res.status(500).json({ error: 'Failed to save AI provider config' });
  }
});

// POST /api/admin/ai-providers/custom-model — configure custom model name with duplicate protection
router.post('/ai-providers/custom-model', requireAdmin, async (req, res) => {
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

    // Reject if model already exists in the standard list
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

    await logAudit({
      userId: req.userId,
      action: 'ADMIN_AI_CONFIG_UPDATE',
      entityType: 'AI',
      entityId: providerId,
      details: {
        what: `Admin ${req.userEmail || req.userId} set custom AI model for ${meta.label} to "${cleanModel}"`,
        when: new Date().toISOString(),
        why: 'Admin configured custom AI model name'
      },
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null
    });

    res.json({ ok: true, providerId, model: cleanModel, config: saved });
  } catch (error) {
    console.error('Admin custom model error:', error);
    res.status(500).json({ error: 'Failed to configure custom model' });
  }
});

// POST /api/admin/ai-test — live round-trip test of the provider chain
router.post('/ai-test', requireAdmin, async (req, res) => {
  try {
    const result = await generateWithFallback({
      systemPrompt: 'You are a connection test. Reply with exactly: OK',
      userPrompt: 'Reply with exactly: OK',
      maxTokens: 10,
      auditContext: 'admin-connectivity-test'
    });

    await auditAiRun({
      userId: req.userId,
      purpose: 'admin-connectivity-test',
      result,
      ip: req.headers['x-forwarded-for'] || null
    });

    res.json({
      ok: !!result.text,
      provider: result.provider,
      model: result.model,
      reply: result.text,
      attempts: result.attempts
    });
  } catch (error) {
    console.error('Admin AI test error:', error);
    res.status(500).json({ error: 'AI test failed' });
  }
});

module.exports = router;
