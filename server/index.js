require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const hpp = require('hpp');
const connectDB = require('./database/connection');
const queueService = require('./services/queueService');
const { generalLimiter, sanitizeInput, maintenanceCheck } = require('./middleware/security');

const app = express();

// ── Security headers ──
app.use(helmet());

// ── CORS ──
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// ── Body parsing ──
app.use(express.json({ limit: '10kb' })); // limit body size
app.use(express.urlencoded({ extended: false }));

// ── Logging ──
app.use(morgan('dev'));

// ── Security middleware ──
app.use(hpp()); // prevent HTTP parameter pollution
app.use(sanitizeInput); // custom input sanitization
app.use(generalLimiter); // rate limiting
app.use(maintenanceCheck); // maintenance mode

// ── Auth routes (no general rate limit) ──
app.use('/api/auth', require('./routes/auth'));

// ── Protected routes ──
app.use('/api/packages', require('./routes/packages'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/beneficiaries', require('./routes/beneficiaries'));
app.use('/api/share', require('./routes/share'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/telecel', require('./routes/telecelAuth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/user-credits', require('./routes/userCredits'));
app.use('/api/data-requests', require('./routes/dataRequests'));
app.use('/api/user-packages', require('./routes/userPackages'));

// ── Admin routes ──
app.use('/api/users', require('./routes/users'));
app.use('/api/api-keys', require('./routes/apiKeys'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/config', require('./routes/config'));

// ── External API (API key auth) ──
app.use('/api/v1', require('./routes/externalApi'));

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, message: `${field} already exists` });
  }
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(e => e.message).join(', ');
    return res.status(400).json({ success: false, message });
  }
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    queueService.start();
  });
});
