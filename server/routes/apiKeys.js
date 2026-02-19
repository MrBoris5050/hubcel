const express = require('express');
const router = express.Router();
const ApiKey = require('../models/ApiKey');
const { protect, adminOnly } = require('../middleware/auth');
const logger = require('../services/logger');

// GET /api/api-keys - List user's API keys
router.get('/', protect, async (req, res) => {
  try {
    const keys = await ApiKey.find({ user: req.user._id }).sort({ createdAt: -1 }).select('-key');
    res.json({ success: true, keys });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/api-keys - Create new API key
router.post('/', protect, async (req, res) => {
  try {
    const { name, permissions, expiresInDays, rateLimit, ipWhitelist } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const { key, keyPrefix } = ApiKey.generateKey();

    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

    const apiKey = await ApiKey.create({
      name,
      key,
      keyPrefix,
      user: req.user._id,
      permissions: permissions || ['share:send', 'beneficiaries:read', 'transactions:read'],
      expiresAt,
      rateLimit: rateLimit || 30,
      ipWhitelist: ipWhitelist || []
    });

    logger.info('API_KEY_CREATE', `API key "${name}" created (${keyPrefix})`, { req, user: req.user });

    // Return the full key ONLY on creation (never again)
    res.status(201).json({
      success: true,
      message: 'API key created. Copy it now - it will not be shown again.',
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        key: key, // only time full key is shown
        keyPrefix: apiKey.keyPrefix,
        permissions: apiKey.permissions,
        expiresAt: apiKey.expiresAt,
        rateLimit: apiKey.rateLimit
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/api-keys/:id - Update API key
router.patch('/:id', protect, async (req, res) => {
  try {
    const { name, permissions, isActive, rateLimit, ipWhitelist } = req.body;
    const key = await ApiKey.findOne({ _id: req.params.id, user: req.user._id });
    if (!key) return res.status(404).json({ success: false, message: 'API key not found' });

    if (name) key.name = name;
    if (permissions) key.permissions = permissions;
    if (isActive !== undefined) key.isActive = isActive;
    if (rateLimit) key.rateLimit = rateLimit;
    if (ipWhitelist) key.ipWhitelist = ipWhitelist;

    await key.save();

    logger.info('API_KEY_UPDATE', `API key "${key.name}" updated`, { req, user: req.user });

    res.json({ success: true, key: { id: key._id, name: key.name, isActive: key.isActive, permissions: key.permissions } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/api-keys/:id - Delete API key
router.delete('/:id', protect, async (req, res) => {
  try {
    const key = await ApiKey.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!key) return res.status(404).json({ success: false, message: 'API key not found' });

    logger.warn('API_KEY_DELETE', `API key "${key.name}" deleted`, { req, user: req.user });

    res.json({ success: true, message: 'API key deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
