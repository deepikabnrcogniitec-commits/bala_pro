const Commission = require('../models/Commission');
const Invoice = require('../models/Invoice');

/**
 * Create a Commission record from a locked Invoice.
 * Formula: commissionBase = grossAmount - ownerDiscount (restaurantFunded discount)
 *          commissionAmount = commissionBase × rate / 100
 */
exports.createFromInvoice = async (invoice) => {
  const ownerDiscount    = invoice.discountBreakup?.restaurantFunded ?? 0;
  const platformDiscount = invoice.discountBreakup?.platformFunded   ?? 0;
  const commissionBase   = Math.max(0, invoice.grossAmount - ownerDiscount);
  const amount           = parseFloat(((commissionBase * invoice.commissionPercentage) / 100).toFixed(2));

  return Commission.create({
    restaurant:       invoice.restaurant,
    booking:          invoice.booking,
    invoice:          invoice._id,
    grossAmount:      invoice.grossAmount,
    ownerDiscount,
    platformDiscount,
    commissionBase,
    percentage:       invoice.commissionPercentage,
    amount,
    status:           'pending',
  });
};

/**
 * Aggregate pending commissions for a restaurant in a period.
 * Returns summary object used when creating a Settlement.
 */
exports.aggregatePending = async ({ restaurantId, from, to }) => {
  const commissions = await Commission.find({
    restaurant: restaurantId,
    status: 'pending',
    createdAt: { $gte: new Date(from), $lte: new Date(to) },
  }).populate('invoice', 'grossAmount discountBreakup netPaid restaurantReceivable');

  if (!commissions.length) return null;

  let totalGrossAmount      = 0;
  let totalOwnerDiscount    = 0;
  let totalPlatformDiscount = 0;
  let totalCommission       = 0;
  let ownerReceivable       = 0;
  const invoiceIds          = [];

  for (const c of commissions) {
    totalGrossAmount      += c.grossAmount;
    totalOwnerDiscount    += c.ownerDiscount;
    totalPlatformDiscount += c.platformDiscount;
    totalCommission       += c.amount;
    if (c.invoice) {
      ownerReceivable += c.invoice.restaurantReceivable ?? 0;
      invoiceIds.push(c.invoice._id);
    }
  }

  return {
    commissions,
    invoiceIds,
    totalBookings:        commissions.length,
    totalGrossAmount:     parseFloat(totalGrossAmount.toFixed(2)),
    totalOwnerDiscount:   parseFloat(totalOwnerDiscount.toFixed(2)),
    totalPlatformDiscount:parseFloat(totalPlatformDiscount.toFixed(2)),
    totalCommission:      parseFloat(totalCommission.toFixed(2)),
    ownerReceivable:      parseFloat(ownerReceivable.toFixed(2)),
  };
};
