const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const creditService = require('../services/creditService');
const { protect, adminOnly } = require('../middleware/auth');
const logger = require('../services/logger');

// GET /api/users - List all users with balances
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    const usersWithBalance = await Promise.all(
      users.map(async (u) => {
        const userObj = u.toObject();
        const creditType = await creditService.getUserCreditType(u._id);
        if (creditType === 'ghs') {
          userObj.balanceGHS = await creditService.getUserGHSBalance(u._id);
          userObj.creditType = 'ghs';
        } else {
          userObj.balanceGB = await creditService.getUserBalance(u._id);
          userObj.creditType = 'gb';
        }
        return userObj;
      })
    );

    res.json({ success: true, users: usersWithBalance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/:id - Single user details
router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const txnCount = await Transaction.countDocuments({ user: user._id });
    const successCount = await Transaction.countDocuments({ user: user._id, status: 'success' });

    res.json({ success: true, user, stats: { totalTransactions: txnCount, successTransactions: successCount } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/users/:id - Update user details
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (email && email !== user.email) {
      const existing = await User.findOne({ email, _id: { $ne: user._id } });
      if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });
      user.email = email;
    }
    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save();

    logger.info('USER_UPDATE', `User ${user.email} updated by ${req.user.email}`, { req, user: req.user });

    res.json({ success: true, message: 'User updated', user: { _id: user._id, name: user.name, email: user.email, phone: user.phone } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/users/:id/toggle - Enable/disable user
router.patch('/:id/toggle', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot disable your own account' });
    }

    user.isActive = !user.isActive;
    await user.save();

    logger.info('USER_TOGGLE', `User ${user.email} ${user.isActive ? 'enabled' : 'disabled'} by ${req.user.email}`, { req, user: req.user });

    res.json({ success: true, message: `User ${user.isActive ? 'enabled' : 'disabled'}`, user: { id: user._id, isActive: user.isActive } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/users/:id/role - Change user role
router.patch('/:id/role', protect, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.role = role;
    await user.save();

    logger.info('USER_ROLE_CHANGE', `User ${user.email} role changed to ${role} by ${req.user.email}`, { req, user: req.user });

    res.json({ success: true, message: `Role changed to ${role}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    logger.warn('USER_DELETE', `User ${user.email} deleted by ${req.user.email}`, { req, user: req.user });

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
