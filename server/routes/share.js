const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const Beneficiary = require('../models/Beneficiary');
const Transaction = require('../models/Transaction');
const QueueJob = require('../models/QueueJob');
const SystemConfig = require('../models/SystemConfig');
const UserPackage = require('../models/UserPackage');
const TelecelService = require('../services/telecelService');
const creditService = require('../services/creditService');
const queueService = require('../services/queueService');
const { protect } = require('../middleware/auth');
const logger = require('../services/logger');

const telecel = new TelecelService();

// POST /api/share/send - Send data directly via Telecel (instant feedback)
// Accepts beneficiaryId OR phone (+ optional name) for direct send
router.post('/send', protect, async (req, res) => {
  try {
    const { beneficiaryId, phone, name, dataGB } = req.body;

    if (!dataGB || (!beneficiaryId && !phone)) {
      return res.status(400).json({ success: false, message: 'dataGB and either beneficiaryId or phone are required' });
    }

    const subscription = await Subscription.findOne({ user: req.user._id, status: 'active' });
    if (!subscription) {
      return res.status(400).json({ success: false, message: 'No active subscription' });
    }

    if (subscription.remainingDataGB < dataGB) {
      return res.status(400).json({ success: false, message: `Insufficient data. Remaining: ${subscription.remainingDataGB}GB` });
    }

    // Resolve beneficiary: by ID or by phone (auto-create if needed)
    let beneficiary;
    if (beneficiaryId) {
      beneficiary = await Beneficiary.findOne({ _id: beneficiaryId, subscription: subscription._id, isActive: true });
      if (!beneficiary) {
        const sourceBeneficiary = await Beneficiary.findById(beneficiaryId);
        if (!sourceBeneficiary) {
          return res.status(404).json({ success: false, message: 'Beneficiary not found' });
        }
        beneficiary = await Beneficiary.findOneAndUpdate(
          { phone: sourceBeneficiary.phone, subscription: subscription._id },
          { user: req.user._id, subscription: subscription._id, name: sourceBeneficiary.name, phone: sourceBeneficiary.phone, isActive: true },
          { upsert: true, new: true }
        );
      }
    } else {
      // Direct phone send — find or auto-create beneficiary
      beneficiary = await Beneficiary.findOne({ phone, subscription: subscription._id, isActive: true });
      if (!beneficiary) {
        beneficiary = await Beneficiary.create({
          user: req.user._id,
          subscription: subscription._id,
          name: name || phone,
          phone,
          isActive: true
        });
      }
    }

    // Call Telecel API directly for instant feedback
    const result = await telecel.sendDataBundle(beneficiary.phone, parseFloat(dataGB));

    // Create transaction record
    const transaction = await Transaction.create({
      user: req.user._id,
      subscription: subscription._id,
      beneficiary: beneficiary._id,
      beneficiaryName: beneficiary.name,
      beneficiaryPhone: beneficiary.phone,
      dataGB: parseFloat(dataGB),
      transactionId: result.transactionId || telecel.generateTransactionId(),
      status: result.success ? 'success' : 'failed',
      telecelResponse: result.data || result.details,
      errorMessage: result.error,
      requiresNewToken: result.requiresNewToken || false,
      sourceType: 'subscription'
    });

    if (result.success) {
      // Deduct from subscription
      subscription.remainingDataGB -= parseFloat(dataGB);
      subscription.usedDataGB += parseFloat(dataGB);
      await subscription.save();

      // Update beneficiary stats
      await Beneficiary.findByIdAndUpdate(beneficiary._id, {
        $inc: { totalSentGB: parseFloat(dataGB) },
        $set: { lastSentAt: new Date() }
      });

      res.json({
        success: true,
        message: `Successfully sent ${dataGB}GB to ${beneficiary.name} (${beneficiary.phone})`,
        transactionId: transaction.transactionId,
        telecelResponse: result.data
      });
    } else {
      res.status(result.statusCode || 400).json({
        success: false,
        message: result.error || 'Failed to send data bundle',
        requiresNewToken: result.requiresNewToken || false,
        telecelResponse: result.details,
        statusCode: result.statusCode
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/share/bulk-send - Queue multiple data sends
router.post('/bulk-send', protect, async (req, res) => {
  try {
    const { distributions } = req.body;
    // distributions: [{ beneficiaryId, dataGB }, ...]

    if (!distributions || !Array.isArray(distributions) || distributions.length === 0) {
      return res.status(400).json({ success: false, message: 'distributions array is required' });
    }

    const subscription = await Subscription.findOne({ user: req.user._id, status: 'active' });
    if (!subscription) {
      return res.status(400).json({ success: false, message: 'No active subscription' });
    }

    const totalRequired = distributions.reduce((sum, d) => sum + d.dataGB, 0);
    if (subscription.remainingDataGB < totalRequired) {
      return res.status(400).json({ success: false, message: `Insufficient data. Need ${totalRequired}GB, have ${subscription.remainingDataGB}GB` });
    }

    // Validate/auto-add all beneficiaries
    const jobs = [];
    for (const dist of distributions) {
      let beneficiary = await Beneficiary.findOne({ _id: dist.beneficiaryId, subscription: subscription._id, isActive: true });
      if (!beneficiary) {
        const sourceBeneficiary = await Beneficiary.findById(dist.beneficiaryId);
        if (!sourceBeneficiary) {
          return res.status(400).json({ success: false, message: `Beneficiary ${dist.beneficiaryId} not found` });
        }
        beneficiary = await Beneficiary.findOneAndUpdate(
          { phone: sourceBeneficiary.phone, subscription: subscription._id },
          { user: req.user._id, subscription: subscription._id, name: sourceBeneficiary.name, phone: sourceBeneficiary.phone, isActive: true },
          { upsert: true, new: true }
        );
      }
      jobs.push({
        user: req.user._id,
        subscription: subscription._id,
        beneficiary: beneficiary._id,
        beneficiaryName: beneficiary.name,
        beneficiaryPhone: beneficiary.phone,
        dataGB: parseFloat(dist.dataGB)
      });
    }

    // Enqueue all
    const created = await queueService.enqueueBulk(jobs);

    res.status(202).json({
      success: true,
      message: `${created.length} jobs queued. They will be processed one at a time.`,
      jobIds: created.map((j) => j._id),
      totalJobs: created.length,
      status: 'queued'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/share/send-from-credit - User self-serve send from credit balance (package-based, instant)
router.post('/send-from-credit', protect, async (req, res) => {
  try {
    const { recipientPhone, recipientName, packageId } = req.body;

    if (!recipientPhone || !recipientName || !packageId) {
      return res.status(400).json({ success: false, message: 'recipientPhone, recipientName, and packageId are required' });
    }

    // Look up the package
    const pkg = await UserPackage.findOne({ _id: packageId, isActive: true });
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found or inactive' });
    }

    const amount = pkg.dataGB;

    // Check max single send limit
    const maxSendGB = await SystemConfig.get('max_single_send_gb') || 100;
    if (amount > maxSendGB) {
      return res.status(400).json({ success: false, message: `Package exceeds max send limit of ${maxSendGB}GB` });
    }

    // Auto-detect user's credit type and check balance (don't deduct yet)
    const userCreditType = await creditService.getUserCreditType(req.user._id);

    if (userCreditType === 'ghs') {
      const balance = await creditService.getUserGHSBalance(req.user._id);
      if (balance < pkg.priceGHS) {
        return res.status(400).json({ success: false, message: `Insufficient GHS credit. Available: GHS ${balance}, needed: GHS ${pkg.priceGHS}` });
      }
    } else {
      const balance = await creditService.getUserBalance(req.user._id);
      if (balance < amount) {
        return res.status(400).json({ success: false, message: `Insufficient credit. Available: ${balance}GB, needed: ${amount}GB` });
      }
    }

    // Call Telecel API FIRST before deducting
    const result = await telecel.sendDataBundle(recipientPhone, amount);

    // Create transaction record
    const transaction = await Transaction.create({
      user: req.user._id,
      beneficiaryName: recipientName,
      beneficiaryPhone: recipientPhone,
      dataGB: amount,
      transactionId: result.transactionId || telecel.generateTransactionId(),
      status: result.success ? 'success' : 'failed',
      telecelResponse: result.data || result.details,
      errorMessage: result.error,
      requiresNewToken: result.requiresNewToken || false,
      sourceType: 'credit'
    });

    if (result.success) {
      // Only deduct credit AFTER confirmed success
      if (userCreditType === 'ghs') {
        await creditService.deductGHSCredit(req.user._id, pkg.priceGHS, req.user._id, `${pkg.name} (GHS ${pkg.priceGHS}) to ${recipientPhone}`);
      } else {
        await creditService.deductCredit(req.user._id, amount, req.user._id, `${pkg.name} (GHS ${pkg.priceGHS}) to ${recipientPhone}`);
      }

      logger.info('CREDIT_SEND', `${req.user.email} sent ${pkg.name} (${amount}GB / GHS ${pkg.priceGHS}) to ${recipientPhone} [${userCreditType || 'gb'} credit]`, { req, user: req.user });

      res.json({
        success: true,
        message: `Successfully sent ${pkg.name} (${amount}GB) to ${recipientName} (${recipientPhone}). Price: GHS ${pkg.priceGHS}`,
        transactionId: transaction.transactionId,
        package: { name: pkg.name, dataGB: pkg.dataGB, priceGHS: pkg.priceGHS },
        telecelResponse: result.data
      });
    } else {
      res.status(result.statusCode || 400).json({
        success: false,
        message: result.error || 'Failed to send data bundle',
        requiresNewToken: result.requiresNewToken || false,
        telecelResponse: result.details,
        statusCode: result.statusCode
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
