const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const Package = require('../models/Package');
const { protect } = require('../middleware/auth');

// POST /api/subscriptions/activate
router.post('/activate', protect, async (req, res) => {
  try {
    const { packageId } = req.body;

    // Check for existing active subscription
    const existing = await Subscription.findOne({ user: req.user._id, status: 'active' });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have an active subscription. Cancel it first.' });
    }

    const pkg = await Package.findById(packageId);
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const subscription = await Subscription.create({
      user: req.user._id,
      package: pkg._id,
      packageName: pkg.name,
      totalDataGB: pkg.dataGB,
      remainingDataGB: pkg.dataGB,
      priceGHS: pkg.priceGHS,
      maxBeneficiaries: pkg.maxBeneficiaries,
      expiresAt
    });

    res.status(201).json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/subscriptions/active
router.get('/active', protect, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id, status: 'active' }).populate('package');

    if (!subscription) {
      return res.json({ success: true, subscription: null });
    }

    // Auto-expire if past date
    if (subscription.expiresAt < new Date()) {
      subscription.status = 'expired';
      await subscription.save();
      return res.json({ success: true, subscription: null });
    }

    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/subscriptions/history
router.get('/history', protect, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('package');
    res.json({ success: true, subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/subscriptions/:id/cancel
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ _id: req.params.id, user: req.user._id, status: 'active' });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Active subscription not found' });
    }

    subscription.status = 'cancelled';
    await subscription.save();
    res.json({ success: true, message: 'Subscription cancelled', subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
