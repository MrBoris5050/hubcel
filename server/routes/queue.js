const express = require('express');
const router = express.Router();
const queueService = require('../services/queueService');
const { protect } = require('../middleware/auth');

// GET /api/queue/status - Queue status summary
router.get('/status', protect, async (req, res) => {
  try {
    const status = await queueService.getStatus(req.user._id);
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/queue/jobs - List queue jobs (paginated + filterable)
router.get('/jobs', protect, async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await queueService.getJobs(req.user._id, {
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/queue/retry - Retry all failed jobs
router.post('/retry', protect, async (req, res) => {
  try {
    const result = await queueService.retryFailed(req.user._id);
    res.json({ success: true, message: `${result.retriedCount} jobs re-queued for retry`, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/queue/cancel - Cancel all pending jobs
router.post('/cancel', protect, async (req, res) => {
  try {
    const result = await queueService.cancelPending(req.user._id);
    res.json({ success: true, message: `${result.cancelledCount} jobs cancelled`, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
