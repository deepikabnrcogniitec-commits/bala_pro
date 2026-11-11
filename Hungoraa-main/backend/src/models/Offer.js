const mongoose = require('mongoose');

const approvalHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['pending_approval', 'approved', 'rejected'] },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const offerSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    code: { type: String, uppercase: true, trim: true, unique: true, sparse: true },

    // Discount type — what kind of discount
    type: {
      type: String,
      enum: ['percentage', 'flat', 'free_item', 'bogo', 'early_bird', 'happy_hours'],
      required: true,
    },
    discountValue: { type: Number, required: true },
    maxDiscount: Number,
    minOrderAmount: { type: Number, default: 0 },
    minGuests: { type: Number, default: 1 },

    // Who funds this discount
    // restaurant: owner bears the full discount → reduces owner earnings
    // platform:   DineSmart bears it → does NOT reduce owner earnings
    // bank:       bank/card issuer bears it (e.g. HDFC 10% off)
    // combined:   split across multiple parties (see fundingBreakup)
    fundedBy: {
      type: String,
      enum: ['restaurant', 'platform', 'bank', 'combined'],
      default: 'restaurant',
    },
    // Used only when fundedBy = 'combined' — must sum to 100
    fundingBreakup: {
      restaurantPercent: { type: Number, default: 0 },
      platformPercent:   { type: Number, default: 0 },
      bankPercent:       { type: Number, default: 0 },
    },

    // Approval workflow (admin must approve before offer goes live)
    approvalRequired: { type: Boolean, default: false },
    approvalStatus: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'rejected'],
      default: 'approved', // backward-compat: offers without approval flow are auto-approved
    },
    approvalHistory: [approvalHistorySchema],
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectionReason: String,

    // Validity
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    validDays: [{ type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }],
    validTimeFrom: String,
    validTimeTo: String,

    // Usage
    totalUsageLimit: Number,
    perUserLimit: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    usedBy: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, usedAt: Date }],

    applicableTo: {
      type: [{ type: String, enum: ['booking', 'pay_bill'] }],
      default: ['booking'],
    },

    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    image: { url: String, publicId: String },
    terms: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

offerSchema.index({ restaurant: 1, isActive: 1, approvalStatus: 1 });
offerSchema.index({ code: 1 });
offerSchema.index({ validFrom: 1, validTo: 1 });
offerSchema.index({ approvalStatus: 1 }); // admin dashboard query

offerSchema.methods.isValid = function (userId, orderAmount, guests) {
  const now = new Date();
  if (this.approvalStatus !== 'approved') return { valid: false, reason: 'Offer is not approved' };
  if (!this.isActive) return { valid: false, reason: 'Offer is inactive' };
  if (now < this.validFrom || now > this.validTo) return { valid: false, reason: 'Offer has expired' };
  if (orderAmount < this.minOrderAmount) return { valid: false, reason: `Minimum order ₹${this.minOrderAmount} required` };
  if (guests < this.minGuests) return { valid: false, reason: `Minimum ${this.minGuests} guests required` };
  if (this.totalUsageLimit && this.usedCount >= this.totalUsageLimit) return { valid: false, reason: 'Offer limit reached' };
  const userUses = this.usedBy.filter((u) => u.user.toString() === userId.toString()).length;
  if (userUses >= this.perUserLimit) return { valid: false, reason: 'You have already used this offer' };
  return { valid: true };
};

// Returns { totalDiscount, restaurantFunded, platformFunded, bankFunded }
offerSchema.methods.calculateDiscount = function (amount) {
  let totalDiscount = 0;
  if (this.type === 'percentage') {
    const raw = (amount * this.discountValue) / 100;
    totalDiscount = this.maxDiscount ? Math.min(raw, this.maxDiscount) : raw;
  } else if (this.type === 'flat') {
    totalDiscount = Math.min(this.discountValue, amount);
  }

  let restaurantFunded = 0;
  let platformFunded = 0;
  let bankFunded = 0;

  if (this.fundedBy === 'restaurant') {
    restaurantFunded = totalDiscount;
  } else if (this.fundedBy === 'platform') {
    platformFunded = totalDiscount;
  } else if (this.fundedBy === 'bank') {
    bankFunded = totalDiscount;
  } else if (this.fundedBy === 'combined') {
    const b = this.fundingBreakup;
    restaurantFunded = (totalDiscount * b.restaurantPercent) / 100;
    platformFunded   = (totalDiscount * b.platformPercent)   / 100;
    bankFunded       = (totalDiscount * b.bankPercent)        / 100;
  }

  return { totalDiscount, restaurantFunded, platformFunded, bankFunded };
};

const Offer = mongoose.model('Offer', offerSchema);
module.exports = Offer;
