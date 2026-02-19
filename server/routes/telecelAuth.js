const express = require('express');
const router = express.Router();
const TelecelService = require('../services/telecelService');
const queueService = require('../services/queueService');
const { protect } = require('../middleware/auth');

const telecel = new TelecelService();

// GET /api/telecel/token-status
router.get('/token-status', protect, async (req, res) => {
  try {
    const status = await telecel.checkTokenStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/telecel/request-otp
router.post('/request-otp', protect, async (req, res) => {
  try {
    const result = await telecel.requestOTP();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/telecel/verify-otp
router.post('/verify-otp', protect, async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, message: 'OTP is required' });
    }
    const result = await telecel.loginWithOTP(otp);
    const resumed = await queueService.resumePaused();
    res.json({ success: true, ...result, resumedJobs: resumed.resumedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/telecel/manual-token
router.post('/manual-token', protect, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }
    const result = await telecel.saveManualToken(token, req.user._id);
    const resumed = await queueService.resumePaused();
    res.json({ success: true, ...result, resumedJobs: resumed.resumedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/telecel/history
router.get('/history', protect, async (req, res) => {
  try {
    const history = await telecel.getTokenHistory();
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
