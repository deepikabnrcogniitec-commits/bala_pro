const mongoose = require('mongoose');

// Singleton document (key: 'platform') holding admin-configurable platform
// settings. Persisted so values survive a server restart — the old in-memory
// object did not.
const platformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'platform', unique: true },

    // ── General ──────────────────────────────────────────────────────────────
    defaultCommission: { type: Number, default: 10 },
    otpExpiry: { type: Number, default: 5 },
    maxOtpAttempts: { type: Number, default: 5 },
    accessTokenExpiry: { type: String, default: '7d' },
    maxRefreshDevices: { type: Number, default: 5 },
    bookingCancellationHours: { type: Number, default: 2 },

    // ── Feature toggles ─────────────────────────────────────────────────────
    enableWallet: { type: Boolean, default: true },
    enableGoogleLogin: { type: Boolean, default: true },
    enableRazorpay: { type: Boolean, default: true },
    enableSmsOtp: { type: Boolean, default: true },
    enableEmailVerification: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },

    // ── Pay Bill: convenience fee + GST (EasyDiner-style) ───────────────────
    // Charged on top of (bill − discount). Platform revenue; does not touch
    // the restaurant's receivable or the commission base.
    convenienceFeeEnabled: { type: Boolean, default: true },
    convenienceFeeType: { type: String, enum: ['flat', 'percent'], default: 'flat' },
    convenienceFeeValue: { type: Number, default: 6 },      // ₹6 flat, or 6% if percent
    convenienceFeeCap: { type: Number, default: 25 },       // max ₹ when percent (0 = no cap)
    convenienceFeeMinBill: { type: Number, default: 0 },    // waive the fee below this bill
    gstOnFeePercent: { type: Number, default: 18 },         // GST on the convenience fee
    // Promo: compute the fee as usual but don't charge it — the app shows
    // the fee struck out with "FREE".
    convenienceFeeWaived: { type: Boolean, default: false },

    // ── Pay Bill: Hungora app discount (platform-funded) ────────────────────
    // Automatic discount for paying through the app, at every restaurant.
    // Applied on (bill − offer discount) and stacks with offers. Booked as
    // platformFunded, so the restaurant's payout and commission are untouched.
    appDiscountEnabled: { type: Boolean, default: false },
    appDiscountType: { type: String, enum: ['flat', 'percent'], default: 'percent' },
    appDiscountValue: { type: Number, default: 0 },         // ₹ flat, or % if percent
    appDiscountCap: { type: Number, default: 0 },           // max ₹ when percent (0 = no cap)
    appDiscountMinBill: { type: Number, default: 0 },       // only on bills ≥ this
    // 'all' = every restaurant · 'selected' = only appDiscountRestaurants
    appDiscountScope: { type: String, enum: ['all', 'selected'], default: 'all' },
    appDiscountRestaurants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }],

    // ── Mobile home screen — hero background (Swiggy-style) ─────────────────
    homeHeroEnabled: { type: Boolean, default: false },
    homeHeroImageUrl: { type: String, default: '' },
    homeHeroVideoUrl: { type: String, default: '' },        // optional looping video (mp4)

    // ── Landing page (hungora.com) — hero banner image ──────────────────────
    // Empty = the landing site falls back to its bundled /bannerimage.png.
    landingHeroImageUrl: { type: String, default: '' },
  },
  { timestamps: true, minimize: false },
);

platformSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: 'platform' });
  if (!doc) doc = await this.create({ key: 'platform' });
  return doc;
};

// Fields the admin panel is allowed to write.
platformSettingsSchema.statics.WRITABLE = [
  'defaultCommission', 'otpExpiry', 'maxOtpAttempts', 'accessTokenExpiry',
  'maxRefreshDevices', 'bookingCancellationHours',
  'enableWallet', 'enableGoogleLogin', 'enableRazorpay', 'enableSmsOtp',
  'enableEmailVerification', 'maintenanceMode',
  'convenienceFeeEnabled', 'convenienceFeeType', 'convenienceFeeValue',
  'convenienceFeeCap', 'convenienceFeeMinBill', 'gstOnFeePercent', 'convenienceFeeWaived',
  'appDiscountEnabled', 'appDiscountType', 'appDiscountValue', 'appDiscountCap', 'appDiscountMinBill',
  'appDiscountScope', 'appDiscountRestaurants',
  'homeHeroEnabled', 'homeHeroImageUrl', 'homeHeroVideoUrl',
  'landingHeroImageUrl',
];

// Fields safe to expose to unauthenticated mobile clients.
platformSettingsSchema.statics.PUBLIC = [
  'homeHeroEnabled', 'homeHeroImageUrl', 'homeHeroVideoUrl',
  'convenienceFeeEnabled', 'maintenanceMode',
  'appDiscountEnabled', 'appDiscountType', 'appDiscountValue', 'appDiscountCap', 'appDiscountMinBill',
  'landingHeroImageUrl',
];

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
