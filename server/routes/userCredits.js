const express = require('express');
const router = express.Router();
const UserCredit = require('../models/UserCredit');
const CreditTransaction = require('../models/CreditTransaction');
const User = require('../models/User');
const creditService = require('../services/creditService');
const { protect, adminOnly } = require('../middleware/auth');
const logger = require('../services/logger');

// POST /api/user-credits/credit - Admin credits data (GB or GHS) to a user
router.post('/credit', protect, adminOnly, async (req, res) => {
  try {
    const { userId, amount, creditType = 'gb', note } = req.body;
    // Support legacy field name
    const finalAmount = amount || req.body.dataGB;

    if (!userId || !finalAmount) {
      return res.status(400).json({ success: false, message: 'userId and amount are required' });
    }

    if (finalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'amount must be positive' });
    }

    if (!['gb', 'ghs'].includes(creditType)) {
      return res.status(400).json({ success: false, message: 'creditType must be gb or ghs' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Enforce per-user: if user already has active credits of the other type, reject
    const existingType = await creditService.getUserCreditType(userId);
    if (existingType && existingType !== creditType) {
      return res.status(400).json({ success: false, message: `User already has active ${existingType.toUpperCase()} credits. Cannot mix credit types.` });
    }

    let credit;
    let msg;
    if (creditType === 'ghs') {
      credit = await creditService.creditUserGHS(userId, parseFloat(finalAmount), req.user._id, note);
      msg = `GHS ${finalAmount} credited to ${targetUser.name}`;
      logger.info('CREDIT_USER', `${req.user.email} credited GHS ${finalAmount} to ${targetUser.email}`, { req, user: req.user });
    } else {
      credit = await creditService.creditUser(userId, parseFloat(finalAmount), req.user._id, note);
      msg = `${finalAmount}GB credited to ${targetUser.name}`;
      logger.info('CREDIT_USER', `${req.user.email} credited ${finalAmount}GB to ${targetUser.email}`, { req, user: req.user });
    }

    res.status(201).json({ success: true, message: msg, credit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/user-credits/debit - Admin debits data (GB or GHS) from a user
router.post('/debit', protect, adminOnly, async (req, res) => {
  try {
    const { userId, amount, creditType = 'gb', note } = req.body;
    const finalAmount = amount || req.body.dataGB;

    if (!userId || !finalAmount) {
      return res.status(400).json({ success: false, message: 'userId and amount are required' });
    }

    if (finalAmount <= 0) {
      return res.status(400).json({ success: false, message: 'amount must be positive' });
    }

    if (!['gb', 'ghs'].includes(creditType)) {
      return res.status(400).json({ success: false, message: 'creditType must be gb or ghs' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let result;
    let msg;
    if (creditType === 'ghs') {
      result = await creditService.deductGHSCredit(userId, parseFloat(finalAmount), req.user._id, note || 'Admin debit');
      msg = `GHS ${finalAmount} debited from ${targetUser.name}. Balance: GHS ${result.balanceAfter}`;
      logger.info('DEBIT_USER', `${req.user.email} debited GHS ${finalAmount} from ${targetUser.email}`, { req, user: req.user });
    } else {
      result = await creditService.deductCredit(userId, parseFloat(finalAmount), req.user._id, note || 'Admin debit');
      msg = `${finalAmount}GB debited from ${targetUser.name}. Balance: ${result.balanceAfter}GB`;
      logger.info('DEBIT_USER', `${req.user.email} debited ${finalAmount}GB from ${targetUser.email}`, { req, user: req.user });
    }

    res.json({ success: true, message: msg, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/user-credits - Admin: list all credits
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const credits = await UserCredit.find()
      .populate('user', 'name email phone')
      .populate('creditedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, credits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/user-credits/user/:userId - Admin: credits for specific user
router.get('/user/:userId', protect, adminOnly, async (req, res) => {
  try {
    const credits = await UserCredit.find({ user: req.params.userId })
      .populate('creditedBy', 'name email')
      .sort({ createdAt: -1 });

    const balance = await creditService.getUserBalance(req.params.userId);

    res.json({ success: true, credits, balance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/user-credits/my-balance - User's own balance
router.get('/my-balance', protect, async (req, res) => {
  try {
    const [balanceGB, balanceGHS, creditType] = await Promise.all([
      creditService.getUserBalance(req.user._id),
      creditService.getUserGHSBalance(req.user._id),
      creditService.getUserCreditType(req.user._id)
    ]);
    res.json({ success: true, balanceGB, balanceGHS, creditType: creditType || 'gb', balance: creditType === 'ghs' ? balanceGHS : balanceGB });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/user-credits/my-history - User's credit history
router.get('/my-history', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      CreditTransaction.find({ user: req.user._id })
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CreditTransaction.countDocuments({ user: req.user._id })
    ]);

    res.json({
      success: true,
      transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
