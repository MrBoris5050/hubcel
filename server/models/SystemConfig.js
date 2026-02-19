const mongoose = require('mongoose');

const SystemConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Default configs
SystemConfigSchema.statics.seedDefaults = async function () {
  const defaults = [
    { key: 'active_sharer_plan', value: 'Bundle Sharer 111GB', description: 'Which Telecel sharer plan to use for API calls' },
    { key: 'subscriber_msisdn', value: '233509310559', description: 'Subscriber MSISDN for Telecel API' },
    { key: 'max_single_send_gb', value: 100, description: 'Max GB per single send request' },
    { key: 'queue_delay_ms', value: 2000, description: 'Delay between queue job processing (ms)' },
    { key: 'queue_max_retries', value: 2, description: 'Max retry attempts per queue job' },
    { key: 'api_enabled', value: true, description: 'Whether external API access is enabled' },
    { key: 'maintenance_mode', value: false, description: 'System maintenance mode' }
  ];

  for (const cfg of defaults) {
    await this.findOneAndUpdate(
      { key: cfg.key },
      { $setOnInsert: cfg },
      { upsert: true }
    );
  }
};

SystemConfigSchema.statics.get = async function (key) {
  const config = await this.findOne({ key });
  return config?.value;
};

SystemConfigSchema.statics.set = async function (key, value, userId) {
  return this.findOneAndUpdate(
    { key },
    { $set: { value, updatedBy: userId } },
    { new: true, upsert: true }
  );
};

module.exports = mongoose.model('SystemConfig', SystemConfigSchema);
