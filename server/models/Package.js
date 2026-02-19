const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  dataGB: { type: Number, required: true },
  priceGHS: { type: Number, required: true },
  maxBeneficiaries: { type: Number, required: true },
  description: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Seed default packages
PackageSchema.statics.seedDefaults = async function() {
  const count = await this.countDocuments();
  if (count > 0) return;

  const packages = [
    { name: 'Bundle Sharer 111GB', dataGB: 111, priceGHS: 380, maxBeneficiaries: 15, description: '111GB monthly data bundle for up to 15 beneficiaries' },
    { name: 'Bundle Sharer 223GB', dataGB: 223, priceGHS: 750, maxBeneficiaries: 25, description: '223GB monthly data bundle for up to 25 beneficiaries' },
    { name: 'Bundle Sharer 557GB', dataGB: 557, priceGHS: 1900, maxBeneficiaries: 50, description: '557GB monthly data bundle for up to 50 beneficiaries' },
    { name: 'Bundle Sharer 1114GB', dataGB: 1114, priceGHS: 3750, maxBeneficiaries: 100, description: '1114GB monthly data bundle for up to 100 beneficiaries' }
  ];

  await this.insertMany(packages);
  console.log('Default packages seeded');
};

module.exports = mongoose.model('Package', PackageSchema);
