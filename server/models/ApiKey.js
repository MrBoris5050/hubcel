const mongoose = require('mongoose');
const crypto = require('crypto');

const ApiKeySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  key: { type: String, required: true, unique: true },
  keyPrefix: { type: String, required: true }, // first 8 chars for display
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  permissions: [{
    type: String,
    enum: ['share:send', 'share:bulk', 'beneficiaries:read', 'beneficiaries:write', 'transactions:read', 'queue:read'],
    default: ['share:send', 'beneficiaries:read', 'transactions:read']
  }],
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date },
  lastUsedAt: { type: Date },
  lastUsedIp: { type: String },
  usageCount: { type: Number, default: 0 },
  rateLimit: { type: Number, default: 30 }, // requests per minute
  ipWhitelist: [{ type: String }] // empty = allow all
}, { timestamps: true });

ApiKeySchema.index({ user: 1, isActive: 1 });

ApiKeySchema.statics.generateKey = function () {
  const key = 'tbk_' + crypto.randomBytes(32).toString('hex');
  return { key, keyPrefix: key.substring(0, 12) };
};

module.exports = mongoose.model('ApiKey', ApiKeySchema);
