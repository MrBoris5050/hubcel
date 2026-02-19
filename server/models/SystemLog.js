const mongoose = require('mongoose');

const SystemLogSchema = new mongoose.Schema({
  level: { type: String, enum: ['info', 'warn', 'error', 'security'], required: true },
  action: { type: String, required: true, index: true },
  message: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ip: { type: String },
  userAgent: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  duration: { type: Number }, // ms
  statusCode: { type: Number }
}, { timestamps: true });

SystemLogSchema.index({ createdAt: -1 });
SystemLogSchema.index({ level: 1, createdAt: -1 });
SystemLogSchema.index({ action: 1, createdAt: -1 });
SystemLogSchema.index({ user: 1, createdAt: -1 });

// Auto-delete logs older than 90 days
SystemLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('SystemLog', SystemLogSchema);
