const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const Beneficiary = require('../models/Beneficiary');
const Transaction = require('../models/Transaction');
const UserPackage = require('../models/UserPackage');
const SystemConfig = require('../models/SystemConfig');
const TelecelService = require('../services/telecelService');
const creditService = require('../services/creditService');
const queueService = require('../services/queueService');
const { getOrCreateActiveSubscription } = require('../services/subscriptionHelper');
const { apiKeyAuth, requirePermission } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/security');
const logger = require('../services/logger');

const telecel = new TelecelService();

// All external API routes require API key auth
router.use(apiKeyAuth);
router.use(apiLimiter);

// GET /api/v1/packages - List available data packages
router.get('/packages', async (req, res) => {
  try {
    const packages = await UserPackage.find({ isActive: true })
      .select('name dataGB priceGHS description')
      .sort({ dataGB: 1 });

    res.json({ success: true, packages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/share/send - Send data via API (instant feedback, supports subscription & credit)
router.post('/share/send', requirePermission('share:send'), async (req, res) => {
  try {
    const { beneficiaryId, phone, name, dataGB, packageId } = req.body;

    if (!dataGB || (!beneficiaryId && !phone)) {
      return res.status(400).json({ success: false, message: 'dataGB and either beneficiaryId or phone are required' });
    }

    const amount = parseFloat(dataGB);
    const recipientPhone = phone || null;
    const recipientName = name || phone || null;

    // Try subscription first, then fall back to credit
    const subscription = await getOrCreateActiveSubscription(req.user);
    const userCreditType = await creditService.getUserCreditType(req.user._id);
    const hasCredit = userCreditType !== null;

    if (!subscription && !hasCredit) {
      return res.status(400).json({ success: false, message: 'No active subscription or credit balance' });
    }

    let sourceType = 'subscription';
    let deductedFromCredit = false;
    let creditDeductAmount = amount;
    let pkg = null;

    if (subscription && subscription.remainingDataGB >= amount) {
      sourceType = 'subscription';
    } else if (hasCredit) {
      sourceType = 'credit';

      if (packageId) {
        pkg = await UserPackage.findOne({ _id: packageId, isActive: true });
        if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
        creditDeductAmount = pkg.dataGB;
      }

      // Check balance only (don't deduct yet)
      if (userCreditType === 'ghs') {
        if (!pkg) return res.status(400).json({ success: false, message: 'packageId is required for GHS credit users' });
        const balance = await creditService.getUserGHSBalance(req.user._id);
        if (balance < pkg.priceGHS) {
          return res.status(400).json({ success: false, message: `Insufficient GHS credit. Available: GHS ${balance}, needed: GHS ${pkg.priceGHS}` });
        }
      } else {
        const balance = await creditService.getUserBalance(req.user._id);
        if (balance < creditDeductAmount) {
          return res.status(400).json({ success: false, message: `Insufficient credit. Available: ${balance}GB, needed: ${creditDeductAmount}GB` });
        }
      }
    } else {
      return res.status(400).json({ success: false, message: `Insufficient data. Subscription remaining: ${subscription.remainingDataGB}GB` });
    }

    // Resolve beneficiary
    let beneficiary;
    if (beneficiaryId && subscription) {
      beneficiary = await Beneficiary.findOne({ _id: beneficiaryId, subscription: subscription._id, isActive: true });
      if (!beneficiary) {
        const sourceBeneficiary = await Beneficiary.findById(beneficiaryId);
        if (!sourceBeneficiary) return res.status(404).json({ success: false, message: 'Beneficiary not found' });
        beneficiary = await Beneficiary.findOneAndUpdate(
          { phone: sourceBeneficiary.phone, subscription: subscription._id },
          { user: req.user._id, subscription: subscription._id, name: sourceBeneficiary.name, phone: sourceBeneficiary.phone, isActive: true },
          { upsert: true, new: true }
        );
      }
    }

    const finalPhone = beneficiary?.phone || recipientPhone;
    const finalName = beneficiary?.name || recipientName || finalPhone;

    // Call Telecel API FIRST before deducting
    const result = await telecel.sendDataBundle(finalPhone, amount);

    // Create transaction record (always, for both success and failure)
    const transaction = await Transaction.create({
      user: req.user._id,
      subscription: subscription?._id,
      beneficiary: beneficiary?._id,
      beneficiaryName: finalName,
      beneficiaryPhone: finalPhone,
      dataGB: amount,
      transactionId: result.transactionId || telecel.generateTransactionId(),
      status: result.success ? 'success' : 'failed',
      telecelResponse: result.data || result.details,
      errorMessage: result.error,
      requiresNewToken: result.requiresNewToken || false,
      sourceType
    });

    if (result.success) {
      // Only deduct AFTER confirmed success
      if (sourceType === 'subscription') {
        subscription.remainingDataGB -= amount;
        subscription.usedDataGB += amount;
        await subscription.save();
      } else if (sourceType === 'credit') {
        if (userCreditType === 'ghs') {
          await creditService.deductGHSCredit(req.user._id, pkg.priceGHS, req.user._id, `API send: ${pkg.name} to ${finalPhone}`);
        } else {
          await creditService.deductCredit(req.user._id, creditDeductAmount, req.user._id, `API send: ${creditDeductAmount}GB to ${finalPhone}`);
        }
      }

      if (beneficiary) {
        await Beneficiary.findByIdAndUpdate(beneficiary._id, {
          $inc: { totalSentGB: amount },
          $set: { lastSentAt: new Date() }
        });
      }

      logger.info('API_SHARE_SEND', `API send: ${amount}GB to ${finalPhone} via key ${req.apiKey.keyPrefix} [${sourceType}]`, { req, user: req.user });

      res.json({
        success: true,
        message: `Successfully sent ${amount}GB to ${finalName} (${finalPhone})`,
        transactionId: transaction.transactionId,
        sourceType,
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

// POST /api/v1/share/bulk - Bulk send
router.post('/share/bulk', requirePermission('share:bulk'), async (req, res) => {
  try {
    const { distributions } = req.body;
    if (!distributions || !Array.isArray(distributions) || distributions.length === 0) {
      return res.status(400).json({ success: false, message: 'distributions array required' });
    }

    const subscription = await getOrCreateActiveSubscription(req.user);
    if (!subscription) return res.status(400).json({ success: false, message: 'No active subscription' });

    const totalRequired = distributions.reduce((sum, d) => sum + d.dataGB, 0);
    if (subscription.remainingDataGB < totalRequired) {
      return res.status(400).json({ success: false, message: `Insufficient data. Need ${totalRequired}GB, have ${subscription.remainingDataGB}GB` });
    }

    const jobs = [];
    for (const dist of distributions) {
      let beneficiary;
      if (dist.beneficiaryId) {
        beneficiary = await Beneficiary.findOne({ _id: dist.beneficiaryId, subscription: subscription._id, isActive: true });
        if (!beneficiary) {
          const sourceBeneficiary = await Beneficiary.findById(dist.beneficiaryId);
          if (!sourceBeneficiary) return res.status(400).json({ success: false, message: `Beneficiary not found: ${dist.beneficiaryId}` });
          beneficiary = await Beneficiary.findOneAndUpdate(
            { phone: sourceBeneficiary.phone, subscription: subscription._id },
            { user: req.user._id, subscription: subscription._id, name: sourceBeneficiary.name, phone: sourceBeneficiary.phone, isActive: true },
            { upsert: true, new: true }
          );
        }
      } else if (dist.phone) {
        beneficiary = await Beneficiary.findOne({ phone: dist.phone, subscription: subscription._id, isActive: true });
        if (!beneficiary) {
          beneficiary = await Beneficiary.create({
            user: req.user._id,
            subscription: subscription._id,
            name: dist.phone,
            phone: dist.phone,
            isActive: true
          });
        }
      } else {
        return res.status(400).json({ success: false, message: 'Each distribution requires beneficiaryId or phone' });
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

    const created = await queueService.enqueueBulk(jobs);

    logger.info('API_SHARE_BULK', `API bulk: ${created.length} jobs via key ${req.apiKey.keyPrefix}`, { req, user: req.user });

    res.status(202).json({ success: true, message: `${created.length} jobs queued`, jobIds: created.map(j => j._id) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/beneficiaries - List beneficiaries
router.get('/beneficiaries', requirePermission('beneficiaries:read'), async (req, res) => {
  try {
    const subscription = await getOrCreateActiveSubscription(req.user);
    if (!subscription) return res.json({ success: true, beneficiaries: [] });

    const beneficiaries = await Beneficiary.find({ subscription: subscription._id, isActive: true }).select('name phone totalSentGB');
    res.json({ success: true, beneficiaries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/transactions - List transactions
router.get('/transactions', requirePermission('transactions:read'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip((parseInt(page) - 1) * parseInt(limit)).limit(parseInt(limit)),
      Transaction.countDocuments(filter)
    ]);

    res.json({ success: true, transactions, pagination: { page: parseInt(page), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/queue/status - Queue status
router.get('/queue/status', requirePermission('queue:read'), async (req, res) => {
  try {
    const status = await queueService.getStatus(req.user._id);
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
