const express = require('express');
const cors = require('cors');
const path = require('path');
const isTestEnv = process.env.NODE_ENV === 'test';

// The server-local .env is authoritative: it declares the port the Vite dev proxy
// forwards /api to. dotenv never overwrites an already-set variable, so loading it
// FIRST makes it win no matter which directory the process was started from.
// (Loading the repo-root .env first used to leak PORT=3000 in here, which silently
// unplugged the proxy and looked exactly like a dead database.)
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
if (isTestEnv) {
  process.env.NODE_ENV = 'test';
}

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const demoRoutes = require('./routes/demo');
const aiRoutes = require('./routes/ai');
const catalogRoutes = require('./routes/catalog');
const paymentRoutes = require('./routes/payment');
const auditRoutes = require('./routes/audit');
const adminRoutes = require('./routes/admin');
const shopifyRoutes = require('./routes/shopify');
const accessRequestRoutes = require('./routes/accessRequests');
const db = require('./db');

const app = express();

// A hosting platform may inject PORT, and a shell can carry a stray value like 0.
// Node treats 0 as "pick any free port", which starts a healthy-looking server on an
// address nothing is proxying to — so validate the candidate instead of trusting it.
function resolvePort() {
  for (const candidate of [process.env.PORT, process.env.API_PORT, 3001]) {
    const parsed = Number(candidate);
    if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) return parsed;
  }
  return 3001;
}

const PORT = resolvePort();

// Middleware
// CORS: only allow our known client origins. CLIENT_ORIGIN is a comma-separated list.
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    // Allow same-origin/no-origin tools (curl, health checks) and listed origins
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/shopify', shopifyRoutes);
app.use('/api/access-requests', accessRequestRoutes);

// Health check — reports database reachability too, so "the app is broken" can be
// told apart from "the database is unreachable" in one request.
app.get('/api/health', async (req, res) => {
  const database = await db.checkConnection();
  res.json({
    status: database.connected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database
  });
});

// Not found / error handlers (JSON, so the client never gets an HTML error page)
app.use('/api', (req, res) => {
  res.status(404).json({ error: `No API route for ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled API error:', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: 'Something went wrong. Please try again later.' });
});

// Start server
if (require.main === module) {
  if (process.env.PORT && String(PORT) !== String(process.env.PORT)) {
    console.warn(`[config] Ignoring unusable PORT="${process.env.PORT}" — listening on ${PORT} instead.`);
  }
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} (API base: /api)`);
  });
}

module.exports = app;
