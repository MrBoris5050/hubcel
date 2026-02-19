const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const Beneficiary = require('../models/Beneficiary');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const UserCredit = require('../models/UserCredit');
const DataRequest = require('../models/DataRequest');
const CreditTransaction = require('../models/CreditTransaction');
const TelecelService = require('../services/telecelService');
const creditService = require('../services/creditService');
const queueService = require('../services/queueService');
const { protect } = require('../middleware/auth');

const telecel = new TelecelService();

// GET /api/dashboard/stats
router.get('/stats', protect, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      // Admin dashboard stats
      const subscription = await Subscription.findOne({ user: req.user._id, status: 'active' });

      const [totalTransactions, successTransactions, failedTransactions, beneficiaryCount, recentTransactions, tokenStatus, totalUsers, pendingRequests, totalCreditsIssued, liveBalance] = await Promise.all([
        Transaction.countDocuments({ user: req.user._id }),
        Transaction.countDocuments({ user: req.user._id, status: 'success' }),
        Transaction.countDocuments({ user: req.user._id, status: 'failed' }),
        subscription ? Beneficiary.countDocuments({ subscription: subscription._id, isActive: true }) : 0,
        Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5).populate('beneficiary', 'name phone'),
        telecel.checkTokenStatus(),
        User.countDocuments(),
        DataRequest.countDocuments({ status: 'pending' }),
        UserCredit.aggregate([
          { $group: { _id: null, totalGB: { $sum: '$dataGB' } } }
        ]),
        telecel.fetchLiveBalance()
      ]);

      const dataSentResult = await Transaction.aggregate([
        { $match: { user: req.user._id, status: 'success' } },
        { $group: { _id: null, totalGB: { $sum: '$dataGB' } } }
      ]);
      const totalDataSentGB = dataSentResult[0]?.totalGB || 0;

      // Use live Telecel balance if available, otherwise fall back to local DB
      const subStats = liveBalance.success ? {
        packageName: liveBalance.plan,
        totalDataGB: liveBalance.totalDataGB,
        remainingDataGB: liveBalance.balanceGB,
        usedDataGB: liveBalance.usedDataGB,
        maxBeneficiaries: subscription?.maxBeneficiaries || liveBalance.planLimit,
        expiresAt: liveBalance.endDate,
        usagePercent: liveBalance.usagePercent,
        liveBalance: true
      } : subscription ? {
        packageName: subscription.packageName,
        totalDataGB: subscription.totalDataGB,
        remainingDataGB: subscription.remainingDataGB,
        usedDataGB: subscription.usedDataGB,
        maxBeneficiaries: subscription.maxBeneficiaries,
        expiresAt: subscription.expiresAt,
        usagePercent: Math.round((subscription.usedDataGB / subscription.totalDataGB) * 100),
        liveBalance: false
      } : null;

      // Sync local subscription with live balance if both exist
      if (liveBalance.success && subscription) {
        subscription.remainingDataGB = liveBalance.balanceGB;
        subscription.usedDataGB = liveBalance.usedDataGB;
        subscription.totalDataGB = liveBalance.totalDataGB;
        subscription.save().catch(() => {}); // fire-and-forget sync
      }

      res.json({
        success: true,
        stats: {
          subscription: subStats,
          beneficiaryCount,
          transactions: { total: totalTransactions, success: successTransactions, failed: failedTransactions },
          totalDataSentGB,
          tokenStatus,
          recentTransactions,
          queue: await queueService.getStatus(req.user._id),
          // Admin extras
          totalUsers,
          pendingRequests,
          totalCreditsIssuedGB: totalCreditsIssued[0]?.totalGB || 0,
          telecelSubscription: liveBalance.success ? liveBalance : null
        }
      });
    } else {
      // User dashboard stats
      const [balanceGB, balanceGHS, userCreditType, pendingRequests, totalReceived, totalReceivedGHS, recentCreditTxns] = await Promise.all([
        creditService.getUserBalance(req.user._id),
        creditService.getUserGHSBalance(req.user._id),
        creditService.getUserCreditType(req.user._id),
        DataRequest.countDocuments({ user: req.user._id, status: 'pending' }),
        CreditTransaction.aggregate([
          { $match: { user: req.user._id, type: 'credit', creditType: { $ne: 'ghs' } } },
          { $group: { _id: null, totalGB: { $sum: '$dataGB' } } }
        ]),
        CreditTransaction.aggregate([
          { $match: { user: req.user._id, type: 'credit', creditType: 'ghs' } },
          { $group: { _id: null, totalGHS: { $sum: '$amountGHS' } } }
        ]),
        CreditTransaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5).populate('performedBy', 'name')
      ]);

      const totalSent = await CreditTransaction.aggregate([
        { $match: { user: req.user._id, type: 'debit', creditType: { $ne: 'ghs' } } },
        { $group: { _id: null, totalGB: { $sum: '$dataGB' } } }
      ]);

      const totalSentGHS = await CreditTransaction.aggregate([
        { $match: { user: req.user._id, type: 'debit', creditType: 'ghs' } },
        { $group: { _id: null, totalGHS: { $sum: '$amountGHS' } } }
      ]);

      const creditType = userCreditType || 'gb';
      const myRequests = await DataRequest.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5);

      res.json({
        success: true,
        stats: {
          creditBalance: creditType === 'ghs' ? balanceGHS : balanceGB,
          creditType,
          balanceGB,
          balanceGHS,
          pendingRequests,
          totalReceivedGB: totalReceived[0]?.totalGB || 0,
          totalReceivedGHS: totalReceivedGHS[0]?.totalGHS || 0,
          totalSentGB: totalSent[0]?.totalGB || 0,
          totalSentGHS: totalSentGHS[0]?.totalGHS || 0,
          recentCreditTransactions: recentCreditTxns,
          recentRequests: myRequests
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
