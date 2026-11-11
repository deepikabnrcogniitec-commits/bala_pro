const Offer = require('../models/Offer');
const DiscountLedger = require('../models/DiscountLedger');

/**
 * Validate and apply an offer.
 * Returns { offer, discountResult, error }
 * discountResult = { totalDiscount, restaurantFunded, platformFunded, bankFunded }
 */
exports.applyOffer = async ({ code, offerId, restaurantId, userId, amount, guests }) => {
  let offer;
  if (offerId) {
    offer = await Offer.findById(offerId);
  } else if (code) {
    offer = await Offer.findOne({ code: code.toUpperCase(), restaurant: restaurantId });
  }

  if (!offer) return { offer: null, discountResult: null, error: 'Invalid offer' };

  const validity = offer.isValid(userId, amount, guests);
  if (!validity.valid) return { offer, discountResult: null, error: validity.reason };

  const discountResult = offer.calculateDiscount(amount);
  return { offer, discountResult, error: null };
};

/**
 * Mark offer as used and create a DiscountLedger record.
 * sourceType: 'booking' | 'bill_payment'
 */
exports.recordOfferUsage = async ({ offer, userId, restaurantId, grossAmount, discountResult, sourceType, sourceId }) => {
  offer.usedBy.push({ user: userId, usedAt: new Date() });
  offer.usedCount += 1;
  await offer.save();

  await DiscountLedger.create({
    offer: offer._id,
    customer: userId,
    restaurant: restaurantId,
    sourceType,
    sourceId,
    offerCode: offer.code,
    grossAmount,
    restaurantFunded: discountResult.restaurantFunded,
    platformFunded:   discountResult.platformFunded,
    bankFunded:       discountResult.bankFunded,
    totalDiscount:    discountResult.totalDiscount,
    status: 'applied',
  });
};

/**
 * Reverse a previously applied discount (e.g. on cancellation).
 */
exports.reverseOfferUsage = async ({ sourceType, sourceId, reason }) => {
  const entry = await DiscountLedger.findOne({ sourceType, sourceId, status: 'applied' });
  if (!entry) return;
  entry.status = 'reversed';
  entry.reversedAt = new Date();
  entry.reversalReason = reason;
  await entry.save();

  await Offer.findByIdAndUpdate(entry.offer, {
    $pull: { usedBy: { user: entry.customer } },
    $inc: { usedCount: -1 },
  });
};
