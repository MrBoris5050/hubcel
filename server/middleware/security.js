const rateLimit = require('express-rate-limit');
const logger = require('../services/logger');

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('RATE_LIMIT', `General rate limit hit`, { req });
    res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
  }
});

// Auth rate limiter (login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('RATE_LIMIT_AUTH', `Auth rate limit hit from ${req.ip}`, { req });
    res.status(429).json({ success: false, message: 'Too many login attempts. Please wait 15 minutes.' });
  }
});

// API rate limiter (no custom keyGenerator - use default IP-based)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('RATE_LIMIT_API', `API rate limit hit`, { req });
    res.status(429).json({ success: false, message: 'API rate limit exceeded. Wait 1 minute.' });
  }
});

// Share rate limiter (prevent rapid sends)
const shareLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('RATE_LIMIT_SHARE', `Share rate limit hit`, { req });
    res.status(429).json({ success: false, message: 'Too many send requests. Please slow down.' });
  }
});

// Request audit logger middleware
const auditLog = (action) => {
  return (req, res, next) => {
    const start = Date.now();
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 400 ? 'warn' : 'info';
      logger.log(level, action, `${req.method} ${req.originalUrl} → ${res.statusCode}`, {
        user: req.user,
        req,
        duration,
        statusCode: res.statusCode,
        metadata: { body: body?.success !== undefined ? { success: body.success } : undefined }
      });
      return originalJson(body);
    };

    next();
  };
};

// Sanitize inputs (strip $ and . from keys to prevent NoSQL injection)
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
        logger.security('NOSQL_INJECTION', `Blocked suspicious key: ${key}`, { req });
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
    return obj;
  };
  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  next();
};

// Maintenance mode check
const SystemConfig = require('../models/SystemConfig');
const maintenanceCheck = async (req, res, next) => {
  try {
    const maintenance = await SystemConfig.get('maintenance_mode');
    if (maintenance && !req.originalUrl.includes('/api/auth/login')) {
      return res.status(503).json({ success: false, message: 'System is under maintenance. Please try again later.' });
    }
  } catch (err) {
    // If config not loaded yet, allow through
  }
  next();
};

module.exports = {
  generalLimiter,
  authLimiter,
  apiLimiter,
  shareLimiter,
  auditLog,
  sanitizeInput,
  maintenanceCheck
};
