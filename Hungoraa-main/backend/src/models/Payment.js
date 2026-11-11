const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    method: { type: String, enum: ['razorpay', 'wallet', 'cash', 'card', 'upi', 'netbanking'], required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'], default: 'pending' },
    type: { type: String, enum: ['deposit', 'full', 'refund', 'wallet_topup'], default: 'deposit' },
    // Razorpay
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    // Refund
    refundAmount: { type: Number, default: 0 },
    refundId: String,
    refundedAt: Date,
    refundReason: String,
    // Meta
    description: String,
    receipt: String,
    failureReason: String,
    paidAt: Date,
  },
  { timestamps: true }
);

paymentSchema.index({ customer: 1, status: 1 });
paymentSchema.index({ booking: 1 });
paymentSchema.index({ razorpayOrderId: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
