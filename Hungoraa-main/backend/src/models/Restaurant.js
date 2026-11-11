const mongoose = require('mongoose');
const slugify = require('slugify');

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    slug: { type: String, unique: true },
    description: { type: String, maxlength: [1000, 'Description cannot exceed 1000 characters'] },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    cuisine: [{ type: String, trim: true }],
    categories: [{ type: String, trim: true }],
    priceRange: { type: String, enum: ['$', '$$', '$$$', '$$$$'], default: '$$' },
    costForTwo: { type: Number, default: 0 },

    images: [{ url: String, publicId: String, isPrimary: { type: Boolean, default: false } }],
    logo: { url: String, publicId: String },

    // Business KYC documents — required for onboarding.
    // select: false — contains PII (PAN/Aadhar numbers, ID scans), must never
    // leak through the public getRestaurantById or listing endpoints.
    // Fetch explicitly with .select('+documents') from admin-only routes.
    documents: {
      type: {
        fssai: {
          number: { type: String, trim: true },
          url: String,
          publicId: String,
        },
        pan: {
          number: { type: String, trim: true, uppercase: true },
          url: String,
          publicId: String,
        },
        aadhar: {
          number: { type: String, trim: true },
          url: String,
          publicId: String,
        },
      },
      select: false,
    },
    documentsVerified: { type: Boolean, default: false },

    contact: {
      phone: String,
      email: String,
      website: String,
    },

    address: {
      street: String,
      city: { type: String, required: true },
      state: { type: String, default: '' },
      pincode: String,
      country: { type: String, default: 'India' },
    },

    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },

    operatingHours: [
      {
        day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
        isOpen: { type: Boolean, default: true },
        slots: [{ open: String, close: String }],
      },
    ],

    tags: [String],
    amenities: [String], // ['wifi', 'parking', 'valet', 'ac', 'rooftop', 'live-music']

    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['pending', 'active', 'approved', 'rejected', 'suspended'],
      default: 'approved',
    },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },

    // Commission settings (set by admin)
    commission: { type: Number, default: 10 },
    commissionType: { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
    subscriptionPlan: { type: String, enum: ['basic', 'premium', 'enterprise'], default: 'basic' },
    subscriptionExpiry: Date,

    // How often settlements are generated for this restaurant
    settlementCycle: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly'],
      default: 'weekly',
    },

    // Offer / discount policy for this restaurant
    discountPolicy: {
      // If true, all new offers from this restaurant require admin approval before going live
      requiresApproval: { type: Boolean, default: false },
      // Maximum discount % that DineSmart will co-fund for this restaurant's offers
      maxPlatformFundedPercent: { type: Number, default: 0 },
      // Offers with discountValue below this are auto-approved without admin review
      autoApproveBelow: { type: Number, default: 0 },
    },

    // SEO & metadata
    metaTitle: String,
    metaDescription: String,

    // Pay Bill feature
    // Pay Bill is on by default — an owner can explicitly turn it off.
    payBillEnabled: { type: Boolean, default: true },

    // Booking settings
    bookingSettings: {
      advanceBookingDays: { type: Number, default: 30 },
      minAdvanceBookingHours: { type: Number, default: 1 },
      maxGuestsPerBooking: { type: Number, default: 20 },
      depositRequired: { type: Boolean, default: false },
      depositAmount: { type: Number, default: 0 },
      cancellationPolicy: { type: String, default: 'Free cancellation up to 2 hours before reservation' },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

restaurantSchema.index({ location: '2dsphere' });
restaurantSchema.index({ slug: 1 });
restaurantSchema.index({ status: 1, isActive: 1, isFeatured: 1 });
restaurantSchema.index({ cuisine: 1 });
restaurantSchema.index({ 'address.city': 1 });
restaurantSchema.index({ averageRating: -1 });

restaurantSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true }) + '-' + Date.now();
  }
  next();
});

restaurantSchema.virtual('branches', {
  ref: 'Branch',
  localField: '_id',
  foreignField: 'restaurant',
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
module.exports = Restaurant;
