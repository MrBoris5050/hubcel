const mongoose = require('mongoose');

const UserCreditSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creditType: { type: String, enum: ['gb', 'ghs'], required: true, default: 'gb' },
  dataGB: { type: Number, default: 0 },
  balanceGB: { type: Number, default: 0 },
  usedGB: { type: Number, default: 0 },
  amountGHS: { type: Number, default: 0 },
  balanceGHS: { type: Number, default: 0 },
  usedGHS: { type: Number, default: 0 },
  note: { type: String },
  status: { type: String, enum: ['active', 'depleted', 'expired'], default: 'active' },
  expiresAt: { type: Date }
}, { timestamps: true });

UserCreditSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('UserCredit', UserCreditSchema);
