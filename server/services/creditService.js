const mongoose = require('mongoose');
const UserCredit = require('../models/UserCredit');
const CreditTransaction = require('../models/CreditTransaction');

function toObjectId(id) {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

const creditService = {
  // Get total available balance for a user
  async getUserBalance(userId) {
    const result = await UserCredit.aggregate([
      { $match: { user: toObjectId(userId), status: 'active' } },
      { $group: { _id: null, totalBalance: { $sum: '$balanceGB' } } }
    ]);
    return result[0]?.totalBalance || 0;
  },

  // Admin credits data to a user
  async creditUser(userId, dataGB, creditedBy, note) {
    const balanceBefore = await this.getUserBalance(userId);

    const credit = await UserCredit.create({
      user: userId,
      creditedBy,
      dataGB,
      balanceGB: dataGB,
      usedGB: 0,
      note,
      status: 'active'
    });

    await CreditTransaction.create({
      user: userId,
      type: 'credit',
      dataGB,
      balanceBefore,
      balanceAfter: balanceBefore + dataGB,
      performedBy: creditedBy,
      note,
      creditSource: credit._id
    });

    return credit;
  },

  // FIFO deduction from oldest active credit
  async deductCredit(userId, dataGB, performedBy, note, relatedRequest) {
    const balanceBefore = await this.getUserBalance(userId);
    if (balanceBefore < dataGB) {
      throw new Error(`Insufficient credit. Available: ${balanceBefore}GB, needed: ${dataGB}GB`);
    }

    let remaining = dataGB;
    const credits = await UserCredit.find({ user: userId, status: 'active', balanceGB: { $gt: 0 } }).sort({ createdAt: 1 });

    for (const credit of credits) {
      if (remaining <= 0) break;

      const deduct = Math.min(credit.balanceGB, remaining);
      credit.balanceGB -= deduct;
      credit.usedGB += deduct;
      if (credit.balanceGB <= 0) credit.status = 'depleted';
      await credit.save();
      remaining -= deduct;
    }

    await CreditTransaction.create({
      user: userId,
      type: 'debit',
      dataGB,
      balanceBefore,
      balanceAfter: balanceBefore - dataGB,
      performedBy,
      note,
      relatedRequest
    });

    return { balanceBefore, balanceAfter: balanceBefore - dataGB };
  },

  // Get user's credit type based on active credits
  async getUserCreditType(userId) {
    const credit = await UserCredit.findOne({ user: userId, status: 'active' });
    if (!credit) return null;
    return credit.creditType || 'gb';
  },

  // Get total available GHS balance for a user
  async getUserGHSBalance(userId) {
    const result = await UserCredit.aggregate([
      { $match: { user: toObjectId(userId), status: 'active', creditType: 'ghs' } },
      { $group: { _id: null, totalBalance: { $sum: '$balanceGHS' } } }
    ]);
    return result[0]?.totalBalance || 0;
  },

  // Admin credits GHS to a user
  async creditUserGHS(userId, amountGHS, creditedBy, note) {
    const balanceBefore = await this.getUserGHSBalance(userId);

    const credit = await UserCredit.create({
      user: userId,
      creditedBy,
      creditType: 'ghs',
      amountGHS,
      balanceGHS: amountGHS,
      usedGHS: 0,
      note,
      status: 'active'
    });

    await CreditTransaction.create({
      user: userId,
      type: 'credit',
      creditType: 'ghs',
      amountGHS,
      balanceBefore,
      balanceAfter: balanceBefore + amountGHS,
      performedBy: creditedBy,
      note,
      creditSource: credit._id
    });

    return credit;
  },

  // FIFO deduction from oldest active GHS credit
  async deductGHSCredit(userId, amountGHS, performedBy, note, relatedRequest) {
    const balanceBefore = await this.getUserGHSBalance(userId);
    if (balanceBefore < amountGHS) {
      throw new Error(`Insufficient GHS credit. Available: GHS ${balanceBefore}, needed: GHS ${amountGHS}`);
    }

    let remaining = amountGHS;
    const credits = await UserCredit.find({ user: userId, status: 'active', creditType: 'ghs', balanceGHS: { $gt: 0 } }).sort({ createdAt: 1 });

    for (const credit of credits) {
      if (remaining <= 0) break;

      const deduct = Math.min(credit.balanceGHS, remaining);
      credit.balanceGHS -= deduct;
      credit.usedGHS += deduct;
      if (credit.balanceGHS <= 0) credit.status = 'depleted';
      await credit.save();
      remaining -= deduct;
    }

    await CreditTransaction.create({
      user: userId,
      type: 'debit',
      creditType: 'ghs',
      amountGHS,
      balanceBefore,
      balanceAfter: balanceBefore - amountGHS,
      performedBy,
      note,
      relatedRequest
    });

    return { balanceBefore, balanceAfter: balanceBefore - amountGHS };
  },

  // Refund GHS credit on failed sends
  async refundGHSCredit(userId, amountGHS, performedBy, note, relatedRequest) {
    const balanceBefore = await this.getUserGHSBalance(userId);

    const depletedCredit = await UserCredit.findOne({ user: userId, status: 'depleted', creditType: 'ghs' }).sort({ createdAt: 1 });
    if (depletedCredit) {
      depletedCredit.balanceGHS += amountGHS;
      depletedCredit.usedGHS -= amountGHS;
      depletedCredit.status = 'active';
      await depletedCredit.save();
    } else {
      const activeCredit = await UserCredit.findOne({ user: userId, status: 'active', creditType: 'ghs' }).sort({ createdAt: 1 });
      if (activeCredit) {
        activeCredit.balanceGHS += amountGHS;
        activeCredit.usedGHS -= amountGHS;
        await activeCredit.save();
      } else {
        await UserCredit.create({
          user: userId,
          creditedBy: performedBy,
          creditType: 'ghs',
          amountGHS,
          balanceGHS: amountGHS,
          usedGHS: 0,
          note: `Refund: ${note}`,
          status: 'active'
        });
      }
    }

    await CreditTransaction.create({
      user: userId,
      type: 'refund',
      creditType: 'ghs',
      amountGHS,
      balanceBefore,
      balanceAfter: balanceBefore + amountGHS,
      performedBy,
      note,
      relatedRequest
    });

    return { balanceBefore, balanceAfter: balanceBefore + amountGHS };
  },

  // Refund credit on failed sends
  async refundCredit(userId, dataGB, performedBy, note, relatedRequest) {
    const balanceBefore = await this.getUserBalance(userId);

    // Add back to oldest depleted credit or create new
    const depletedCredit = await UserCredit.findOne({ user: userId, status: 'depleted' }).sort({ createdAt: 1 });
    if (depletedCredit) {
      depletedCredit.balanceGB += dataGB;
      depletedCredit.usedGB -= dataGB;
      depletedCredit.status = 'active';
      await depletedCredit.save();
    } else {
      const activeCredit = await UserCredit.findOne({ user: userId, status: 'active' }).sort({ createdAt: 1 });
      if (activeCredit) {
        activeCredit.balanceGB += dataGB;
        activeCredit.usedGB -= dataGB;
        await activeCredit.save();
      } else {
        // Create a refund credit entry
        await UserCredit.create({
          user: userId,
          creditedBy: performedBy,
          dataGB,
          balanceGB: dataGB,
          usedGB: 0,
          note: `Refund: ${note}`,
          status: 'active'
        });
      }
    }

    await CreditTransaction.create({
      user: userId,
      type: 'refund',
      dataGB,
      balanceBefore,
      balanceAfter: balanceBefore + dataGB,
      performedBy,
      note,
      relatedRequest
    });

    return { balanceBefore, balanceAfter: balanceBefore + dataGB };
  }
};

module.exports = creditService;
