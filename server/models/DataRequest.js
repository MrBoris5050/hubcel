const mongoose = require('mongoose');

const DataRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientPhone: { type: String, required: true },
  recipientName: { type: String, required: true },
  dataGB: { type: Number, required: true },
  priceGHS: { type: Number },
  package: { type: mongoose.Schema.Types.ObjectId, ref: 'UserPackage' },
  packageName: { type: String },
  reason: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed', 'failed'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewNote: { type: String },
  queueJob: { type: mongoose.Schema.Types.ObjectId, ref: 'QueueJob' },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }
}, { timestamps: true });

DataRequestSchema.index({ user: 1, status: 1, createdAt: -1 });
DataRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('DataRequest', DataRequestSchema);
