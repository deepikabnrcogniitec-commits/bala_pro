const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      match: [/^\+?[1-9]\d{9,14}$/, 'Please enter a valid phone number'],
    },
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    avatar: {
      url: String,
      publicId: String,
    },
    role: {
      type: String,
      enum: ['customer', 'owner', 'admin', 'staff'],
      default: 'customer',
    },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },

    // Google OAuth
    googleId: { type: String, unique: true, sparse: true },

    // OTP
    otp: {
      code: String,
      expiresAt: Date,
      attempts: { type: Number, default: 0 },
    },

    // Password reset
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Email verification
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    // Refresh tokens (for multi-device support)
    refreshTokens: [
      {
        token: String,
        deviceId: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // FCM push notification token
    fcmTokens: [String],

    // Customer profile extras
    dateOfBirth: Date,
    gender: { type: String, enum: ['male', 'female', 'other', ''] },
    addresses: [
      {
        label: String,
        street: String,
        city: String,
        state: String,
        pincode: String,
        location: {
          type: { type: String, enum: ['Point'], default: 'Point' },
          coordinates: { type: [Number], default: [0, 0] },
        },
        isDefault: { type: Boolean, default: false },
      },
    ],

    // Saved restaurants
    savedRestaurants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }],

    // Wallet reference
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet' },

    // Owner-specific
    restaurantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' }],

    // Notification preferences
    notificationPrefs: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      bookingUpdates: { type: Boolean, default: true },
      offers: { type: Boolean, default: true },
    },

    lastLoginAt: Date,
    lastLoginIp: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for geo queries
userSchema.index({ 'addresses.location': '2dsphere' });
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1, isActive: 1 });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate OTP
userSchema.methods.generateOTP = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = {
    code,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    attempts: 0,
  };
  return code;
};

// Verify OTP
userSchema.methods.verifyOTP = function (code) {
  if (!this.otp?.code) return { valid: false, reason: 'No OTP found' };
  if (this.otp.attempts >= 5) return { valid: false, reason: 'Too many attempts' };
  if (new Date() > this.otp.expiresAt) return { valid: false, reason: 'OTP expired' };

  this.otp.attempts += 1;

  if (this.otp.code !== code) return { valid: false, reason: 'Invalid OTP' };

  this.otp = undefined;
  return { valid: true };
};

// Clear sensitive fields for response
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.refreshTokens;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
