const express = require('express');
const router = express.Router();
const UserPackage = require('../models/UserPackage');
const { protect, adminOnly } = require('../middleware/auth');
const logger = require('../services/logger');

// GET /api/user-packages - List all active packages (any authenticated user)
router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { isActive: true };
    const packages = await UserPackage.find(filter).sort({ dataGB: 1 });
    res.json({ success: true, packages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/user-packages - Admin creates a package
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, dataGB, priceGHS, description } = req.body;

    if (!name || !dataGB || priceGHS === undefined) {
      return res.status(400).json({ success: false, message: 'name, dataGB, and priceGHS are required' });
    }

    if (dataGB <= 0 || priceGHS < 0) {
      return res.status(400).json({ success: false, message: 'dataGB must be positive and priceGHS cannot be negative' });
    }

    const pkg = await UserPackage.create({
      name,
      dataGB: parseFloat(dataGB),
      priceGHS: parseFloat(priceGHS),
      description,
      createdBy: req.user._id
    });

    logger.info('USER_PACKAGE_CREATE', `${req.user.email} created package: ${name} (${dataGB}GB / GHS ${priceGHS})`, { req, user: req.user });

    res.status(201).json({ success: true, message: 'Package created', package: pkg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/user-packages/:id - Admin updates a package
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, dataGB, priceGHS, description, isActive } = req.body;

    const pkg = await UserPackage.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    if (name !== undefined) pkg.name = name;
    if (dataGB !== undefined) pkg.dataGB = parseFloat(dataGB);
    if (priceGHS !== undefined) pkg.priceGHS = parseFloat(priceGHS);
    if (description !== undefined) pkg.description = description;
    if (isActive !== undefined) pkg.isActive = isActive;
    await pkg.save();

    logger.info('USER_PACKAGE_UPDATE', `${req.user.email} updated package: ${pkg.name}`, { req, user: req.user });

    res.json({ success: true, message: 'Package updated', package: pkg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/user-packages/:id - Admin deletes a package
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const pkg = await UserPackage.findByIdAndDelete(req.params.id);
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    logger.info('USER_PACKAGE_DELETE', `${req.user.email} deleted package: ${pkg.name}`, { req, user: req.user });

    res.json({ success: true, message: 'Package deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
