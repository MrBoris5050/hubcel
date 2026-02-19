const Subscription = require('../models/Subscription');
const Package = require('../models/Package');
const TelecelService = require('./telecelService');

const telecel = new TelecelService();

async function getOrCreateActiveSubscription(user) {
  let subscription = await Subscription.findOne({ user: user._id, status: 'active' });

  if (subscription && subscription.expiresAt < new Date()) {
    subscription.status = 'expired';
    await subscription.save();
    subscription = null;
  }

  if (!subscription && user.role === 'admin') {
    try {
      const liveBalance = await telecel.fetchLiveBalance();
      if (liveBalance.success) {
        const pkg = await Package.findOne({ name: liveBalance.plan, isActive: true });

        const endDate = liveBalance.endDate;
        let expiresAt;
        if (endDate && endDate.length === 8) {
          expiresAt = new Date(`${endDate.substring(0,4)}-${endDate.substring(4,6)}-${endDate.substring(6,8)}`);
        } else {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);
        }

        subscription = await Subscription.create({
          user: user._id,
          package: pkg ? pkg._id : (await Package.findOne({ isActive: true }))?._id,
          packageName: liveBalance.plan,
          totalDataGB: liveBalance.totalDataGB,
          remainingDataGB: liveBalance.balanceGB,
          usedDataGB: liveBalance.usedDataGB,
          priceGHS: pkg?.priceGHS || 0,
          maxBeneficiaries: liveBalance.planLimit || pkg?.maxBeneficiaries || 15,
          expiresAt
        });
      }
    } catch (err) {
      console.error('[SUBSCRIPTION_HELPER] Failed to fetch live balance:', err.message);
    }
  }

  // Sync with live balance if subscription exists
  if (subscription && user.role === 'admin') {
    try {
      const liveBalance = await telecel.fetchLiveBalance();
      if (liveBalance.success) {
        subscription.remainingDataGB = liveBalance.balanceGB;
        subscription.usedDataGB = liveBalance.usedDataGB;
        subscription.totalDataGB = liveBalance.totalDataGB;
        await subscription.save();
      }
    } catch (_) {}
  }

  return subscription;
}

module.exports = { getOrCreateActiveSubscription };
