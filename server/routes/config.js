const express = require('express');
const router = express.Router();
const SystemConfig = require('../models/SystemConfig');
const { protect, adminOnly } = require('../middleware/auth');
const logger = require('../services/logger');

// GET /api/config - Get all config
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    await SystemConfig.seedDefaults();
    const configs = await SystemConfig.find().sort({ key: 1 });
    res.json({ success: true, configs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/config/:key - Update a config value
router.patch('/:key', protect, adminOnly, async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ success: false, message: 'Value is required' });

    const config = await SystemConfig.set(req.params.key, value, req.user._id);

    logger.info('CONFIG_UPDATE', `Config "${req.params.key}" updated to "${value}"`, { req, user: req.user });

    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
