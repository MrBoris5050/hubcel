const mongoose = require('mongoose');

const BeneficiarySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  totalSentGB: { type: Number, default: 0 },
  lastSentAt: { type: Date },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

BeneficiarySchema.index({ user: 1, subscription: 1 });
BeneficiarySchema.index({ subscription: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Beneficiary', BeneficiarySchema);
