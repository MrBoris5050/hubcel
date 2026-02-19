const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
  beneficiaryName: { type: String, required: true },
  beneficiaryPhone: { type: String, required: true },
  dataGB: { type: Number, required: true },
  transactionId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  telecelResponse: { type: mongoose.Schema.Types.Mixed },
  errorMessage: { type: String },
  requiresNewToken: { type: Boolean, default: false },
  sourceType: { type: String, enum: ['subscription', 'credit'], default: 'subscription' }
}, { timestamps: true });

TransactionSchema.index({ user: 1, createdAt: -1 });
TransactionSchema.index({ subscription: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
