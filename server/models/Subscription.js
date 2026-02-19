const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  packageName: { type: String, required: true },
  totalDataGB: { type: Number, required: true },
  remainingDataGB: { type: Number, required: true },
  usedDataGB: { type: Number, default: 0 },
  priceGHS: { type: Number, required: true },
  maxBeneficiaries: { type: Number, required: true },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  activatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

SubscriptionSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
