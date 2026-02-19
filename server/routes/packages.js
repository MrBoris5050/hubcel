const express = require('express');
const router = express.Router();
const Package = require('../models/Package');
const { protect } = require('../middleware/auth');

// GET /api/packages - List all packages (auto-seeds on first request)
router.get('/', protect, async (req, res) => {
  try {
    await Package.seedDefaults();
    const packages = await Package.find({ isActive: true }).sort({ dataGB: 1 });
    res.json({ success: true, packages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
