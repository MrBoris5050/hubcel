const express = require('express');
const router = express.Router();
const DataRequest = require('../models/DataRequest');
const Transaction = require('../models/Transaction');
const QueueJob = require('../models/QueueJob');
const SystemConfig = require('../models/SystemConfig');
const UserPackage = require('../models/UserPackage');
const TelecelService = require('../services/telecelService');
const creditService = require('../services/creditService');
const queueService = require('../services/queueService');
const { protect, adminOnly } = require('../middleware/auth');
const logger = require('../services/logger');

const telecel = new TelecelService();

// POST /api/data-requests - User sends data instantly from credit balance
router.post('/', protect, async (req, res) => {
  try {
    const { recipientPhone, recipientName, packageId, reason } = req.body;

    if (!recipientPhone || !packageId) {
      return res.status(400).json({ success: false, message: 'recipientPhone and packageId are required' });
    }

    const finalName = recipientName || recipientPhone;

    const pkg = await UserPackage.findOne({ _id: packageId, isActive: true });
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found or inactive' });
    }

    const amount = pkg.dataGB;
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

    // Call Telecel API first
    const result = await telecel.sendDataBundle(recipientPhone, amount);

    // Create transaction record
    const transaction = await Transaction.create({
      user: req.user._id,
      beneficiaryName: finalName,
      beneficiaryPhone: recipientPhone,
      dataGB: amount,
      transactionId: result.transactionId || telecel.generateTransactionId(),
      status: result.success ? 'success' : 'failed',
      telecelResponse: result.data || result.details,
      errorMessage: result.error,
      requiresNewToken: result.requiresNewToken || false,
      sourceType: 'credit'
    });

    // Create data request record for history
    const request = await DataRequest.create({
      user: req.user._id,
      recipientPhone,
      recipientName: finalName,
      dataGB: pkg.dataGB,
      priceGHS: pkg.priceGHS,
      package: pkg._id,
      packageName: pkg.name,
      reason,
      status: result.success ? 'completed' : 'failed',
      reviewedAt: new Date()
    });

    if (result.success) {
      // Deduct credit only after success
      if (userCreditType === 'ghs') {
        await creditService.deductGHSCredit(req.user._id, pkg.priceGHS, req.user._id, `${pkg.name} (GHS ${pkg.priceGHS}) to ${recipientPhone}`);
      } else {
        await creditService.deductCredit(req.user._id, amount, req.user._id, `${pkg.name} (GHS ${pkg.priceGHS}) to ${recipientPhone}`);
      }

      logger.info('DATA_REQUEST_SEND', `${req.user.email} sent ${pkg.name} (${amount}GB / GHS ${pkg.priceGHS}) to ${recipientPhone} [instant]`, { req, user: req.user });

      res.status(201).json({
        success: true,
        message: `Successfully sent ${pkg.name} (${amount}GB) to ${finalName} (${recipientPhone}). Price: GHS ${pkg.priceGHS}`,
        transactionId: transaction.transactionId,
        request
      });
    } else {
      res.status(result.statusCode || 400).json({
        success: false,
        message: result.error || 'Failed to send data bundle',
        requiresNewToken: result.requiresNewToken || false,
        telecelResponse: result.details,
        request
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/data-requests/my-requests - User's own requests
router.get('/my-requests', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const [requests, total] = await Promise.all([
      DataRequest.find(filter)
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DataRequest.countDocuments(filter)
    ]);

    res.json({
      success: true,
      requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/data-requests/:id - User cancels pending request
router.delete('/:id', protect, async (req, res) => {
  try {
    const request = await DataRequest.findOne({ _id: req.params.id, user: req.user._id, status: 'pending' });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Pending request not found' });
    }

    await DataRequest.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Request cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/data-requests/pending - Admin: all pending requests
router.get('/pending', protect, adminOnly, async (req, res) => {
  try {
    const requests = await DataRequest.find({ status: 'pending' })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/data-requests/all - Admin: all requests (filtered)
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const filter = {};
    if (status) filter.status = status;

    const [requests, total] = await Promise.all([
      DataRequest.find(filter)
        .populate('user', 'name email phone')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DataRequest.countDocuments(filter)
    ]);

    res.json({
      success: true,
      requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/data-requests/:id/approve - Admin approves request → creates QueueJob
router.patch('/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const { reviewNote } = req.body;

    const request = await DataRequest.findById(req.params.id).populate('user', 'name email');
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}` });
    }

    // Create queue job for credit-based send
    const job = await QueueJob.create({
      user: request.user._id,
      beneficiaryName: request.recipientName,
      beneficiaryPhone: request.recipientPhone,
      dataGB: request.dataGB,
      status: 'pending',
      sourceType: 'credit',
      dataRequest: request._id
    });

    request.status = 'approved';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewNote = reviewNote;
    request.queueJob = job._id;
    await request.save();

    // Kick off queue processing
    setImmediate(() => queueService.processNext());

    logger.info('DATA_REQUEST_APPROVE', `${req.user.email} approved request ${request._id} for ${request.dataGB}GB`, { req, user: req.user });

    res.json({ success: true, message: 'Request approved and queued for sending', request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/data-requests/:id/reject - Admin rejects request
router.patch('/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const { reviewNote } = req.body;

    const request = await DataRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}` });
    }

    request.status = 'rejected';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    request.reviewNote = reviewNote;
    await request.save();

    logger.info('DATA_REQUEST_REJECT', `${req.user.email} rejected request ${request._id}`, { req, user: req.user });

    res.json({ success: true, message: 'Request rejected', request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
