const express = require('express');
const router = express.Router();
const SystemLog = require('../models/SystemLog');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/logs - List system logs (paginated + filterable)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { level, action, page = 1, limit = 50, search } = req.query;
    const filter = {};

    if (level) filter.level = level;
    if (action) filter.action = { $regex: action, $options: 'i' };
    if (search) filter.message = { $regex: search, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      SystemLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'name email'),
      SystemLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      logs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/logs/stats - Log stats
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [info, warn, error, security, total] = await Promise.all([
      SystemLog.countDocuments({ level: 'info' }),
      SystemLog.countDocuments({ level: 'warn' }),
      SystemLog.countDocuments({ level: 'error' }),
      SystemLog.countDocuments({ level: 'security' }),
      SystemLog.countDocuments()
    ]);

    // Recent security events
    const recentSecurity = await SystemLog.find({ level: 'security' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');

    res.json({ success: true, stats: { info, warn, error, security, total }, recentSecurity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/logs/clear - Clear old logs
router.delete('/clear', protect, adminOnly, async (req, res) => {
  try {
    const { olderThanDays = 30 } = req.query;
    const cutoff = new Date(Date.now() - parseInt(olderThanDays) * 24 * 60 * 60 * 1000);
    const result = await SystemLog.deleteMany({ createdAt: { $lt: cutoff } });
    res.json({ success: true, message: `${result.deletedCount} logs cleared` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
