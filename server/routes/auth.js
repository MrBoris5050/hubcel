const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const logger = require('../services/logger');

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // First user ever becomes admin, subsequent users are regular users
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'user';

    const user = await User.create({ name, email, password, phone, role });
    const token = generateToken(user._id);

    logger.info('AUTH_REGISTER', `New ${role} registered: ${email}`, { req, user });

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role }
    });
  } catch (error) {
    logger.error('AUTH_REGISTER_ERROR', error.message, { req });
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      logger.security('AUTH_LOGIN_FAIL', `Failed login attempt for: ${email}`, { req });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      logger.security('AUTH_LOGIN_DISABLED', `Disabled user login attempt: ${email}`, { req });
      return res.status(403).json({ success: false, message: 'Your account has been disabled' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.security('AUTH_LOGIN_FAIL', `Wrong password for: ${email}`, { req });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update login info
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.headers['x-forwarded-for'] || req.ip;
    user.loginCount += 1;
    await user.save();

    const token = generateToken(user._id);
    logger.info('AUTH_LOGIN', `User logged in: ${email}`, { req, user });

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role }
    });
  } catch (error) {
    logger.error('AUTH_LOGIN_ERROR', error.message, { req });
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
