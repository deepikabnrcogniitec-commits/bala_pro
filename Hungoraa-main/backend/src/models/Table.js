const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    name: { type: String, required: true, trim: true },
    number: { type: Number, required: true },
    capacity: { type: Number, required: true, min: 1, max: 30 },
    type: { type: String, enum: ['indoor', 'outdoor', 'booth', 'bar', 'private'], default: 'indoor' },
    floor: { type: String, default: 'Ground' },
    position: String, // 'window', 'center', 'corner'
    features: [String], // ['wheelchair-accessible', 'power-outlet', 'view']
    isAvailable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    minimumGuests: { type: Number, default: 1 },
    maximumGuests: { type: Number },
    images: [{ url: String, publicId: String }],
  },
  { timestamps: true }
);

tableSchema.index({ restaurant: 1, branch: 1, isActive: 1 });

const Table = mongoose.model('Table', tableSchema);
module.exports = Table;
