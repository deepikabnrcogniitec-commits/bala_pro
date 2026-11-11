const mongoose = require('mongoose');

// One record per offer application. Gives a full audit trail of every discount
// awarded, who funded it, and whether it was later reversed (e.g. on cancellation).

const discountLedgerSchema = new mongoose.Schema(
  {
    offer:      { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: true },
    customer:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },

    // Source of this ledger entry
    sourceType: { type: String, enum: ['booking', 'bill_payment'], required: true },
    sourceId:   { type: mongoose.Schema.Types.ObjectId, required: true }, // Booking._id or BillPayment._id

    offerCode:   String,
    grossAmount: { type: Number, required: true }, // order amount before discount

    // Discount split
    restaurantFunded: { type: Number, default: 0 },
    platformFunded:   { type: Number, default: 0 },
    bankFunded:       { type: Number, default: 0 },
    totalDiscount:    { type: Number, required: true },

    status: {
      type: String,
      enum: ['applied', 'reversed'],
      default: 'applied',
    },
    reversedAt:     Date,
    reversalReason: String,

    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

discountLedgerSchema.index({ restaurant: 1, appliedAt: -1 });
discountLedgerSchema.index({ offer: 1 });
discountLedgerSchema.index({ customer: 1 });
discountLedgerSchema.index({ sourceType: 1, sourceId: 1 }, { unique: true });

const DiscountLedger = mongoose.model('DiscountLedger', discountLedgerSchema);
module.exports = DiscountLedger;
