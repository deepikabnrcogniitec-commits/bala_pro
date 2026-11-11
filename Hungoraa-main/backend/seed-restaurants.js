// Loads sample restaurants from seed-data/restaurants.json into the restaurants collection.
//   node seed-restaurants.js --validate-only   (checks every row against the schema, no database needed)
//   node seed-restaurants.js                   (inserts; rows that already exist by name are skipped)
// Restaurants are owned by the owner account created by seed.js (owner@dinesmart.in).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Restaurant = require('./src/models/Restaurant');

const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-data', 'restaurants.json'), 'utf8'));
const validateOnly = process.argv.includes('--validate-only');

async function main() {
  if (validateOnly) {
    let bad = 0;
    for (const row of rows) {
      const doc = new Restaurant({ ...row, owner: new mongoose.Types.ObjectId() });
      const err = doc.validateSync();
      if (err) { bad++; console.log(`INVALID ${row.name}: ${Object.keys(err.errors).join(', ')}`); }
      else console.log(`OK      ${row.name} (${row.address.city})`);
    }
    console.log(`\n${rows.length - bad}/${rows.length} rows valid`);
    process.exitCode = bad ? 1 : 0;
    return;
  }

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dinesmart';
  await mongoose.connect(MONGO_URI);
  try {
    const owner = (await User.findOne({ email: 'owner@dinesmart.in' })) || (await User.findOne({ role: 'owner' }));
    if (!owner) throw new Error('No owner account found. Run "node seed.js" first.');

    let created = 0, skipped = 0;
    for (const row of rows) {
      if (await Restaurant.exists({ name: row.name, owner: owner._id })) {
        skipped++; console.log(`SKIP   ${row.name} (already exists)`); continue;
      }
      await Restaurant.create({ ...row, owner: owner._id });
      created++; console.log(`ADD    ${row.name} (${row.address.city})`);
    }
    console.log(`\nDone: ${created} added, ${skipped} skipped.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((e) => { console.error('Seed failed:', e.message); process.exitCode = 1; });
