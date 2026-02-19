require('dotenv').config();
const mongoose = require('mongoose');
const UserPackage = require('./models/UserPackage');

const PRICE_PER_GB = 3.45;

const sizes = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 70, 80, 100, 200];

const packages = sizes.map(gb => ({
  name: `${gb}GB Data Bundle`,
  dataGB: gb,
  priceGHS: parseFloat((gb * PRICE_PER_GB).toFixed(2)),
  description: `${gb}GB data bundle`,
  isActive: true
}));

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await UserPackage.deleteMany({});
    console.log('Cleared existing packages');

    const created = await UserPackage.insertMany(packages);
    console.log(`Created ${created.length} packages:\n`);

    created.forEach(p => {
      console.log(`  ${p.name.padEnd(22)} => GHS ${p.priceGHS.toFixed(2)}`);
    });

    console.log('\nDone!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

seed();
