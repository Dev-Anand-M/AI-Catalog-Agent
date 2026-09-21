import handleAccessRequests from './_routes/access-requests/index.js';
import handleAdmin from './_routes/admin/index.js';
import handleAdminAccessRequests from './_routes/admin/access-requests/index.js';
import handleAdminApprove from './_routes/admin/access-requests/[id]/approve.js';
import handleAdminReject from './_routes/admin/access-requests/[id]/reject.js';
import handleAi from './_routes/ai/index.js';
import handleAudit from './_routes/audit/index.js';
import handleAuth from './_routes/auth/index.js';
import handleCatalog from './_routes/catalog/[userId].js';
import handleDemo from './_routes/demo/products.js';
import handlePayment from './_routes/payment/index.js';
import handleProducts from './_routes/products/index.js';
import handleProductItem from './_routes/products/[id].js';
import handleShopify from './_routes/shopify/index.js';
import handleShopifySync from './_routes/shopify/sync.js';
import handleUploadImage from './_routes/upload/image.js';
import handleHealth from './_routes/health.js';

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = url.pathname;

  // Strip leading /api if present
  if (pathname.startsWith('/api')) {
    pathname = pathname.slice(4) || '/';
  }

  // Populate req.query with search params if missing
  if (!req.query) req.query = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (req.query[key] === undefined) {
      req.query[key] = value;
    }
  }

  try {
    // Health check
    if (pathname === '' || pathname === '/' || pathname === '/health') {
      return handleHealth(req, res);
    }

    // Access requests
    if (pathname === '/access-requests') {
      return handleAccessRequests(req, res);
    }

    // Auth
    if (pathname === '/auth' || pathname.startsWith('/auth/')) {
      if (pathname === '/auth/login') req.query.action = 'login';
      else if (pathname === '/auth/signup') req.query.action = 'signup';
      else if (pathname === '/auth/me') req.query.action = 'me';
      else if (pathname === '/auth/change-password') req.query.action = 'change-password';
      return handleAuth(req, res);
    }

    // AI
    if (pathname === '/ai' || pathname.startsWith('/ai/')) {
      return handleAi(req, res);
    }

    // Demo
    if (pathname === '/demo/products') {
      return handleDemo(req, res);
    }

    // Catalog public
    if (pathname.startsWith('/catalog/')) {
      req.query.userId = pathname.split('/')[2];
      return handleCatalog(req, res);
    }

    // Payment
    if (pathname === '/payment') {
      return handlePayment(req, res);
    }

    // Audit
    if (pathname === '/audit') {
      return handleAudit(req, res);
    }

    // Products
    if (pathname === '/products') {
      return handleProducts(req, res);
    }
    if (pathname.startsWith('/products/')) {
      req.query.id = pathname.split('/')[2];
      return handleProductItem(req, res);
    }

    // Shopify
    if (pathname === '/shopify/sync') {
      return handleShopifySync(req, res);
    }
    if (pathname === '/shopify' || pathname === '/shopify/status') {
      return handleShopify(req, res);
    }

    // Upload
    if (pathname === '/upload/image') {
      return handleUploadImage(req, res);
    }

    // Admin
    if (pathname.startsWith('/admin')) {
      const approveMatch = pathname.match(/^\/admin\/access-requests\/([^/]+)\/approve$/);
      if (approveMatch) {
        req.query.id = approveMatch[1];
        return handleAdminApprove(req, res);
      }
      const rejectMatch = pathname.match(/^\/admin\/access-requests\/([^/]+)\/reject$/);
      if (rejectMatch) {
        req.query.id = rejectMatch[1];
        return handleAdminReject(req, res);
      }
      if (pathname === '/admin/access-requests') {
        return handleAdminAccessRequests(req, res);
      }
      return handleAdmin(req, res);
    }

    return res.status(404).json({ error: `Not found: ${pathname}` });
  } catch (err) {
    console.error('API Router error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}
