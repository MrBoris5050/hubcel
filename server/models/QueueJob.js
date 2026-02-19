const mongoose = require('mongoose');

const QueueJobSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
  beneficiaryName: { type: String, required: true },
  beneficiaryPhone: { type: String, required: true },
  dataGB: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'paused'],
    default: 'pending'
  },
  priority: { type: Number, default: 0 }, // higher = processed first
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 2 },
  result: {
    success: Boolean,
    transactionId: String,
    message: String,
    telecelResponse: mongoose.Schema.Types.Mixed,
    requiresNewToken: Boolean,
    statusCode: Number
  },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  sourceType: { type: String, enum: ['subscription', 'credit'], default: 'subscription' },
  creditType: { type: String, enum: ['gb', 'ghs'] },
  refundAmountGHS: { type: Number },
  dataRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'DataRequest' },
  processedAt: { type: Date },
  error: { type: String }
}, { timestamps: true });

QueueJobSchema.index({ status: 1, priority: -1, createdAt: 1 });
QueueJobSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('QueueJob', QueueJobSchema);
