const mongoose = require('mongoose');

const CreditTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['credit', 'debit', 'refund'], required: true },
  creditType: { type: String, enum: ['gb', 'ghs'], default: 'gb' },
  dataGB: { type: Number, default: 0 },
  amountGHS: { type: Number, default: 0 },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String },
  priceGHS: { type: Number },
  package: { type: mongoose.Schema.Types.ObjectId, ref: 'UserPackage' },
  creditSource: { type: mongoose.Schema.Types.ObjectId, ref: 'UserCredit' },
  relatedRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'DataRequest' }
}, { timestamps: true });

CreditTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('CreditTransaction', CreditTransactionSchema);
