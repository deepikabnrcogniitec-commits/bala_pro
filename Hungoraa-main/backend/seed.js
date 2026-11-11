require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dinesmart';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: String,
  role: { type: String, enum: ['customer', 'owner', 'admin', 'staff'], default: 'customer' },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isBlocked: { type: Boolean, default: false },
  refreshTokens: [],
  fcmTokens: [],
  savedRestaurants: [],
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const seeds = [
  {
    name: 'Super Admin',
    email: 'admin@dinesmart.in',
    password: 'Admin@1234',
    role: 'admin',
    isEmailVerified: true,
  },
  {
    name: 'Restaurant Owner',
    email: 'owner@dinesmart.in',
    password: 'Owner@1234',
    role: 'owner',
    isEmailVerified: true,
  },
  {
    name: 'Test Customer',
    email: 'customer@dinesmart.in',
    phone: '+919876543210',
    password: 'Customer@1234',
    role: 'customer',
    isEmailVerified: true,
    isPhoneVerified: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB:', MONGO_URI);

    for (const data of seeds) {
      const existing = await User.findOne({ email: data.email });
      if (existing) {
        console.log(`  ✓ Already exists: ${data.email} (${data.role})`);
        continue;
      }

      const hashed = await bcrypt.hash(data.password, 12);
      await User.create({ ...data, password: hashed });
      console.log(`  ✓ Created: ${data.email} (${data.role}) — password: ${data.password}`);
    }

    console.log('\nSeed complete. Login credentials:');
    console.log('─────────────────────────────────────────');
    console.log('  Admin Panel   → admin@dinesmart.in   / Admin@1234');
    console.log('  Owner Panel   → owner@dinesmart.in   / Owner@1234');
    console.log('  Mobile App    → customer@dinesmart.in / Customer@1234');
    console.log('─────────────────────────────────────────');
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
