const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiKey = require('../models/ApiKey');
const logger = require('../services/logger');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Please login to access this route' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      logger.security('AUTH_INVALID_USER', 'Token references non-existent user', { req, metadata: { userId: decoded.id } });
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.isActive) {
      logger.security('AUTH_DISABLED_USER', `Disabled user attempted access: ${user.email}`, { req, user });
      return res.status(403).json({ success: false, message: 'Your account has been disabled' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
    }
    logger.security('AUTH_INVALID_TOKEN', 'Invalid JWT presented', { req });
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    logger.security('AUTH_ADMIN_DENIED', `Non-admin ${req.user.email} tried admin route`, { req, user: req.user });
    return res.status(403).json({ success: false, message: 'Admin access only' });
  }
  next();
};

// API Key authentication
const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ success: false, message: 'API key required. Pass it in x-api-key header.' });
    }

    const key = await ApiKey.findOne({ key: apiKey, isActive: true }).populate('user', '-password');

    if (!key) {
      logger.security('API_KEY_INVALID', 'Invalid API key used', { req, metadata: { keyPrefix: apiKey.substring(0, 12) } });
      return res.status(401).json({ success: false, message: 'Invalid or inactive API key' });
    }

    // Check expiry
    if (key.expiresAt && key.expiresAt < new Date()) {
      logger.warn('API_KEY_EXPIRED', `Expired API key used: ${key.keyPrefix}`, { req });
      return res.status(401).json({ success: false, message: 'API key has expired' });
    }

    // Check IP whitelist
    if (key.ipWhitelist.length > 0) {
      const clientIp = req.headers['x-forwarded-for'] || req.ip;
      if (!key.ipWhitelist.includes(clientIp)) {
        logger.security('API_KEY_IP_BLOCKED', `IP ${clientIp} not in whitelist for key ${key.keyPrefix}`, { req });
        return res.status(403).json({ success: false, message: 'IP address not authorized for this API key' });
      }
    }

    // Check user is active
    if (!key.user || !key.user.isActive) {
      return res.status(403).json({ success: false, message: 'API key owner account is disabled' });
    }

    // Update usage
    key.lastUsedAt = new Date();
    key.lastUsedIp = req.headers['x-forwarded-for'] || req.ip;
    key.usageCount += 1;
    await key.save();

    req.user = key.user;
    req.apiKey = key;
    next();
  } catch (error) {
    logger.error('API_KEY_ERROR', error.message, { req });
    return res.status(500).json({ success: false, message: 'API key authentication error' });
  }
};

// Check specific API key permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.apiKey && !req.apiKey.permissions.includes(permission)) {
      logger.security('API_PERMISSION_DENIED', `Key ${req.apiKey.keyPrefix} lacks permission: ${permission}`, { req });
      return res.status(403).json({ success: false, message: `API key lacks permission: ${permission}` });
    }
    next();
  };
};

module.exports = { generateToken, protect, adminOnly, apiKeyAuth, requirePermission };
