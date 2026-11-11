const mongoose = require('mongoose');

const discountBreakupSchema = new mongoose.Schema(
  {
    restaurantFunded: { type: Number, default: 0 },
    platformFunded:   { type: Number, default: 0 },
    bankFunded:       { type: Number, default: 0 },
    total:            { type: Number, default: 0 },
  },
  { _id: false }
);

const billPaymentSchema = new mongoose.Schema(
  {
    billPaymentId: { type: String, unique: true },

    customer:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },

    // ── Bill lifecycle ───────────────────────────────────────────────────────
    // open     : bill fetched, customer viewing
    // preview  : offer applied, showing final amount before payment
    // paid     : payment successful
    // cancelled: customer abandoned
    billStatus: {
      type: String,
      enum: ['open', 'preview', 'paid', 'cancelled'],
      default: 'open',
    },

    billAmount:      { type: Number, required: true, min: 1 }, // gross amount from restaurant

    // Offer / discount applied during Pay Bill
    offer:           { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    offerCode:       String,
    discountBreakup: { type: discountBreakupSchema, default: () => ({}) },
    // Hungora app discount (admin setting). Already included in
    // discountBreakup.platformFunded/total; kept separately for display.
    appDiscount:     { type: Number, default: 0, min: 0 },
    appDiscountLabel: String,                              // e.g. "10% off · up to ₹50"

    // Voluntary tip — added by the customer at checkout. Paid on top of the
    // bill, passed through 100% to the restaurant: NOT part of the commission
    // base and NOT reduced by any discount.
    tipAmount:       { type: Number, default: 0, min: 0 },

    // Platform charges added on top of (bill − discount). Platform revenue —
    // they do NOT change the restaurant's receivable or the commission base.
    convenienceFee:  { type: Number, default: 0, min: 0 },
    gstAmount:       { type: Number, default: 0, min: 0 }, // GST charged on the convenience fee

    finalAmount:     { type: Number, required: true }, // (bill − discount) + convenienceFee + gstAmount + tip

    // Commission (same EasyDiner formula as Invoice)
    commissionPercentage:  { type: Number, default: 10 },
    commissionBase:        { type: Number, default: 0 }, // billAmount − restaurantFunded discount
    commissionAmount:      { type: Number, default: 0 },
    restaurantReceivable:  { type: Number, default: 0 },

    paymentMethod: {
      type: String,
      enum: ['razorpay', 'wallet', 'card', 'upi'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },

    // Razorpay
    razorpayOrderId:   String,
    razorpayPaymentId: String,
    razorpaySignature: String,

    // Human-readable payment reference (UPI ref, card last4, etc.)
    paymentReference: String,

    paidAt: Date,

    // Links to the generated invoice (created after successful payment)
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  },
  { timestamps: true }
);

billPaymentSchema.pre('save', function (next) {
  if (!this.billPaymentId) {
    this.billPaymentId = `BP${Date.now().toString().slice(-8)}`;
  }

  const ownerDiscount = this.discountBreakup?.restaurantFunded ?? 0;
  this.commissionBase = Math.max(0, this.billAmount - ownerDiscount);
  this.commissionAmount = parseFloat(
    ((this.commissionBase * this.commissionPercentage) / 100).toFixed(2)
  );
  // Tip is added back in full — the platform takes no commission on it.
  this.restaurantReceivable = parseFloat(
    (this.commissionBase - this.commissionAmount + (this.tipAmount || 0)).toFixed(2)
  );

  next();
});

billPaymentSchema.index({ customer: 1, createdAt: -1 });
billPaymentSchema.index({ restaurant: 1, paymentStatus: 1 });
billPaymentSchema.index({ billStatus: 1 });

const BillPayment = mongoose.model('BillPayment', billPaymentSchema);
module.exports = BillPayment;
