const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },

    date: { type: String, required: true }, // 'YYYY-MM-DD'
    time: { type: String, required: true }, // '7:30 PM'
    guests: { type: Number, required: true, min: 1 },
    duration: { type: Number, default: 90 }, // minutes

    // held: table is temporarily locked (5-min window) while customer completes deposit
    status: {
      type: String,
      enum: ['held', 'pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show', 'rescheduled'],
      default: 'pending',
    },
    // Temporary hold — auto-released by a cron job if payment not completed in time
    holdExpiresAt: Date,
    holdStatus: {
      type: String,
      enum: ['none', 'held', 'released', 'confirmed'],
      default: 'none',
    },

    // How the booking was created
    bookingSource: {
      type: String,
      enum: ['mobile', 'web', 'walk-in', 'phone', 'owner'],
      default: 'mobile',
    },
    statusHistory: [
      {
        status: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],

    specialRequest: String,
    occasion: { type: String, enum: ['birthday', 'anniversary', 'business', 'date', 'family', 'other', ''] },

    // Payment
    paymentMethod: { type: String, enum: ['razorpay', 'wallet', 'cash', 'card'], default: 'cash' },
    depositAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: false },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },

    // Coupon
    couponCode: String,
    discountAmount: { type: Number, default: 0 },

    // Communication
    reminderSent: { type: Boolean, default: false },
    confirmedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Review
    hasReview: { type: Boolean, default: false },
    review: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' },

    // Owner notes
    ownerNotes: String,

    // Commission
    commissionAmount: { type: Number, default: 0 },
    commissionPaid: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

bookingSchema.pre('save', function (next) {
  if (!this.bookingId) {
    this.bookingId = `DS${Date.now().toString().slice(-8)}`;
  }
  next();
});

bookingSchema.index({ customer: 1, status: 1 });
bookingSchema.index({ restaurant: 1, date: 1, status: 1 });
bookingSchema.index({ bookingId: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
