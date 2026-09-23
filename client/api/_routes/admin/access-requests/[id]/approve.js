import bcrypt from 'bcryptjs';
import { db } from '../../../_lib/db.js';
import { requireAdmin } from '../../../_lib/adminGuard.js';
import { provisionAccountFromRequest } from '../../../_lib/provisioning.js';

/**
 * POST /api/admin/access-requests/:id/approve
 *
 * Approving creates a merchant store account OR approves a password reset
 * request by issuing temporary credentials for the merchant.
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const id = req.query.id;
    const request = await db.findAccessRequestById(id);
    if (!request) return res.status(404).json({ error: 'Access request not found' });

    // Handle password reset request
    if (request.source === 'password_reset') {
      const existingUser = (request.provisionedUserId ? await db.findUserById(request.provisionedUserId) : null)
        || (request.email ? await db.findUserByEmail(request.email) : null)
        || (request.phone ? await db.findUserByPhone(request.phone) : null);

      if (!existingUser) {
        return res.status(404).json({ error: 'Matching user account for password reset was not found' });
      }

      // Generate a clean memorable temporary password: e.g. Seller + 4 digits
      const temporaryPassword = 'Seller' + Math.floor(1000 + Math.random() * 9000);
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);

      await db.updateUser(existingUser.id, {
        passwordHash,
        mustChangePassword: true
      });

      await db.updateAccessRequest(id, {
        status: 'approved',
        reviewedBy: req.userEmail || String(req.userId),
        reviewedAt: new Date().toISOString()
      });

      db.insertAuditLog({
        userId: req.userId,
        action: 'PASSWORD_RESET_APPROVED',
        entityType: 'USER',
        entityId: existingUser.id,
        details: JSON.stringify({
          what: `Admin ${req.userEmail || req.userId} approved password reset for "${existingUser.name}" (${existingUser.email || existingUser.phone})`,
          when: new Date().toISOString()
        }),
        createdAt: new Date().toISOString()
      }).catch(() => {});

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

    await db.updateAccessRequest(id, {
      status: 'approved',
      reviewedBy: req.userEmail || String(req.userId),
      reviewedAt: new Date().toISOString(),
      provisionedUserId: user.id
    });

    db.insertAuditLog({
      userId: req.userId,
      action: 'ACCESS_REQUEST_APPROVE',
      entityType: 'ACCESS_REQUEST',
      entityId: id,
      details: JSON.stringify({
        what: `Admin ${req.userEmail || req.userId} approved "${request.businessName || request.name}" and created store account #${user.id}`,
        when: new Date().toISOString(),
        why: 'Approved from the Admin portal'
      }),
      ip: req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null,
      createdAt: new Date().toISOString()
    }).catch(() => {});

    // The temporary password is returned exactly once — never stored in plain text.
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
    console.error('Admin approve access-request error:', error.message);
    res.status(error.status || 500).json({ error: error.message || 'Could not create the account' });
  }
}

export default requireAdmin(handler);
