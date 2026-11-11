const mongoose = require('mongoose');

const settlementHistorySchema = new mongoose.Schema(
  {
    status:    { type: String, enum: ['pending', 'processing', 'generated', 'paid', 'failed'] },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note:      String,
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const settlementSchema = new mongoose.Schema(
  {
    settlementId: { type: String, unique: true },

    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },

    periodFrom: { type: Date, required: true },
    periodTo:   { type: Date, required: true },

    // References to every invoice included in this settlement
    invoices:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
    commissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Commission' }],

    // Aggregated financials
    totalBookings:        { type: Number, default: 0 },
    totalGrossAmount:     { type: Number, default: 0 }, // sum of invoice.grossAmount
    totalOwnerDiscount:   { type: Number, default: 0 }, // sum of restaurantFunded discounts
    totalPlatformDiscount:{ type: Number, default: 0 }, // sum of platformFunded discounts
    totalCommission:      { type: Number, default: 0 }, // sum of commissionAmount
    ownerReceivable:      { type: Number, default: 0 }, // sum of restaurantReceivable

    // Status lifecycle: pending → processing → generated → paid  (or → failed)
    status: {
      type: String,
      enum: ['pending', 'processing', 'generated', 'paid', 'failed'],
      default: 'pending',
    },
    settlementHistory: [settlementHistorySchema],

    // Payment details (when admin marks as paid)
    paymentMethod:  { type: String, enum: ['bank_transfer', 'upi', 'cheque', 'other'] },
    transactionRef: String,
    paidAt:         Date,
    failureReason:  String,

    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes:       String,
  },
  { timestamps: true }
);

settlementSchema.pre('save', function (next) {
  if (!this.settlementId) {
    this.settlementId = `SET${Date.now().toString().slice(-8)}`;
  }
  next();
});

// Push a status-change event into history
settlementSchema.methods.addHistory = function (status, changedBy, note) {
  this.status = status;
  this.settlementHistory.push({ status, changedBy, note });
};

settlementSchema.index({ restaurant: 1, status: 1 });
settlementSchema.index({ periodFrom: 1, periodTo: 1 });
settlementSchema.index({ status: 1 }); // admin dashboard

const Settlement = mongoose.model('Settlement', settlementSchema);
module.exports = Settlement;
