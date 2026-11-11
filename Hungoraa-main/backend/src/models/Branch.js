const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true },
    address: {
      street: String,
      city: { type: String, required: true },
      state: String,
      pincode: String,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    contact: { phone: String, email: String },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    operatingHours: [
      {
        day: { type: String, enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] },
        isOpen: { type: Boolean, default: true },
        slots: [{ open: String, close: String }],
      },
    ],
    isActive: { type: Boolean, default: true },
    isMainBranch: { type: Boolean, default: false },
    averageRating: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

branchSchema.index({ location: '2dsphere' });
branchSchema.index({ restaurant: 1, isActive: 1 });

const Branch = mongoose.model('Branch', branchSchema);
module.exports = Branch;
