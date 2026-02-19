const express = require('express');
const router = express.Router();
const Beneficiary = require('../models/Beneficiary');
const Subscription = require('../models/Subscription');
const { protect } = require('../middleware/auth');

// POST /api/beneficiaries
router.post('/', protect, async (req, res) => {
  try {
    const { name, phone } = req.body;

    const subscription = await Subscription.findOne({ user: req.user._id, status: 'active' });
    if (!subscription) {
      return res.status(400).json({ success: false, message: 'No active subscription. Activate a package first.' });
    }

    // Check beneficiary limit
    const currentCount = await Beneficiary.countDocuments({ subscription: subscription._id, isActive: true });
    if (currentCount >= subscription.maxBeneficiaries) {
      return res.status(400).json({ success: false, message: `Maximum ${subscription.maxBeneficiaries} beneficiaries reached for this package` });
    }

    // Check duplicate phone in this subscription
    const existing = await Beneficiary.findOne({ subscription: subscription._id, phone });
    if (existing) {
      return res.status(400).json({ success: false, message: 'This phone number is already a beneficiary' });
    }

    const beneficiary = await Beneficiary.create({
      user: req.user._id,
      subscription: subscription._id,
      name,
      phone
    });

    res.status(201).json({ success: true, beneficiary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/beneficiaries
router.get('/', protect, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id, status: 'active' });
    if (!subscription) {
      return res.json({ success: true, beneficiaries: [], maxBeneficiaries: 0 });
    }

    const beneficiaries = await Beneficiary.find({ subscription: subscription._id, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, beneficiaries, maxBeneficiaries: subscription.maxBeneficiaries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/beneficiaries/:id
router.patch('/:id', protect, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const beneficiary = await Beneficiary.findOne({ _id: req.params.id, user: req.user._id });
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Beneficiary not found' });
    }

    if (name) beneficiary.name = name;
    if (phone) beneficiary.phone = phone;
    await beneficiary.save();

    res.json({ success: true, beneficiary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/beneficiaries/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findOne({ _id: req.params.id, user: req.user._id });
    if (!beneficiary) {
      return res.status(404).json({ success: false, message: 'Beneficiary not found' });
    }

    beneficiary.isActive = false;
    await beneficiary.save();

    res.json({ success: true, message: 'Beneficiary removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
