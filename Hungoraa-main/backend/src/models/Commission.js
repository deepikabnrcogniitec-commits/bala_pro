const mongoose = require('mongoose');

// Commission is calculated per booking using the EasyDiner formula:
//   commissionBase   = invoiceGrossAmount − ownerDiscount
//   commissionAmount = commissionBase × commissionRate
//
// Platform-funded and bank-funded discounts do NOT reduce the commissionBase
// because the restaurant never bore that cost.

const commissionSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    booking:    { type: mongoose.Schema.Types.ObjectId, ref: 'Booking',    required: true },
    invoice:    { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice',    required: true },

    // Raw amounts from the invoice
    grossAmount:      { type: Number, required: true }, // invoice.grossAmount
    ownerDiscount:    { type: Number, default: 0 },     // invoice.discountBreakup.restaurantFunded
    platformDiscount: { type: Number, default: 0 },     // invoice.discountBreakup.platformFunded

    // Derived
    commissionBase:   { type: Number, required: true }, // grossAmount − ownerDiscount
    percentage:       { type: Number, required: true }, // commission rate applied
    amount:           { type: Number, required: true }, // commissionBase × percentage / 100

    status: {
      type: String,
      enum: ['pending', 'included', 'settled'],
      default: 'pending',
    },

    settlement: { type: mongoose.Schema.Types.ObjectId, ref: 'Settlement' },
    settledAt:  Date,
  },
  { timestamps: true }
);

commissionSchema.index({ restaurant: 1, status: 1 });
commissionSchema.index({ settlement: 1 });
commissionSchema.index({ booking: 1 });

const Commission = mongoose.model('Commission', commissionSchema);
module.exports = Commission;
