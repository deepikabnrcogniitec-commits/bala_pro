const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// Tracks exactly who funded which portion of the discount
const discountBreakupSchema = new mongoose.Schema(
  {
    restaurantFunded: { type: Number, default: 0 }, // reduces owner earnings
    platformFunded:   { type: Number, default: 0 }, // absorbed by DineSmart
    bankFunded:       { type: Number, default: 0 }, // absorbed by card issuer/bank
    total:            { type: Number, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceId: { type: String, unique: true },

    booking:     { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    customer:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurant:  { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    items: [invoiceItemSchema],

    // ── Amount chain ────────────────────────────────────────────────────────
    // grossAmount:    full food bill before any discount or tax
    // ownerDiscount:  discount portion funded by the restaurant (reduces earnings)
    // platformDiscount: discount portion funded by DineSmart (does NOT reduce owner earnings)
    // bankDiscount:   discount funded by bank/card (does NOT reduce owner earnings)
    // subtotal:       grossAmount − totalDiscount (what customer pays before tax)
    // taxAmount:      GST on subtotal
    // netPaid:        what the customer actually paid (subtotal + tax)
    grossAmount:       { type: Number, required: true, min: 0 },
    discountBreakup:   { type: discountBreakupSchema, default: () => ({}) },
    taxPercentage:     { type: Number, default: 5 },
    taxAmount:         { type: Number, default: 0 },
    netPaid:           { type: Number, required: true },  // customer's actual payment (incl. tip)

    // Voluntary tip — passed through 100% to the restaurant, not commissionable
    tipAmount:         { type: Number, default: 0 },
    // Platform charges collected from the customer (Pay Bill) — platform revenue,
    // not part of restaurantReceivable
    convenienceFee:    { type: Number, default: 0 },
    gstAmount:         { type: Number, default: 0 },

    // Offer ref
    offer:             { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
    offerCode:         String,

    // ── Commission (EasyDiner-style) ─────────────────────────────────────────
    // Commission is calculated ONLY on (grossAmount − ownerDiscount)
    // i.e., platform-funded and bank-funded discounts do NOT reduce owner commission base
    commissionPercentage: { type: Number, default: 10 },
    commissionBase:       { type: Number, default: 0 }, // grossAmount − ownerDiscount
    commissionAmount:     { type: Number, default: 0 }, // commissionBase × commissionPercentage/100
    restaurantReceivable: { type: Number, default: 0 }, // commissionBase − commissionAmount

    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'wallet', 'razorpay'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
    paidAt: Date,

    status: {
      type: String,
      enum: ['draft', 'locked', 'sent', 'paid', 'cancelled'],
      default: 'draft',
    },

    // Settlement tracking
    settlementStatus: {
      type: String,
      enum: ['pending', 'included', 'settled'],
      default: 'pending',
    },
    settlement: { type: mongoose.Schema.Types.ObjectId, ref: 'Settlement' },

    notes: String,
    isLocked: { type: Boolean, default: false }, // true after booking completed
  },
  { timestamps: true }
);

invoiceSchema.pre('save', function (next) {
  if (!this.invoiceId) {
    this.invoiceId = `INV${Date.now().toString().slice(-8)}`;
  }

  // Recompute commission fields whenever amounts change
  const ownerDiscount = this.discountBreakup?.restaurantFunded ?? 0;
  this.commissionBase = Math.max(0, this.grossAmount - ownerDiscount);
  this.commissionAmount = parseFloat(
    ((this.commissionBase * this.commissionPercentage) / 100).toFixed(2)
  );
  this.restaurantReceivable = parseFloat(
    (this.commissionBase - this.commissionAmount + (this.tipAmount || 0)).toFixed(2)
  );

  next();
});

invoiceSchema.index({ booking: 1 });
invoiceSchema.index({ restaurant: 1, paymentStatus: 1, settlementStatus: 1 });
invoiceSchema.index({ customer: 1 });
invoiceSchema.index({ settlementStatus: 1, restaurant: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;
