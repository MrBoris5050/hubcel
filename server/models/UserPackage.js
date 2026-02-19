const mongoose = require('mongoose');

const UserPackageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  dataGB: { type: Number, required: true },
  priceGHS: { type: Number, required: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

UserPackageSchema.index({ isActive: 1, dataGB: 1 });

module.exports = mongoose.model('UserPackage', UserPackageSchema);
