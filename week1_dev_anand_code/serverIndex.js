/**
 * Week 1 Implementation: Express Server Entrypoint
 * Developer: Dev Anand (Tech Lead)
 * Assigned Task: Voice Input & API Routes Setup
 */

const express = require('express');
const cors = require('cors');

const authRoutes = require('./authRoutes');
const aiRoutes = require('./aiRoutes');
const productRoutes = require('./productRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    developer: 'Dev Anand (Tech Lead)',
    stage: 'Week 1 - Core Storefront API Engine'
  });
});

// Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/products', productRoutes);

// Global Error Catching Middleware
app.use((err, req, res, next) => {
  console.error('Express Server Global Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Week 1 Express Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
