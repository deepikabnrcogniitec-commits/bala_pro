const PlatformSettings = require('../models/PlatformSettings');

// Short-lived cache so a burst of quote/pay calls doesn't hammer Mongo.
let cache = null;
let cachedAt = 0;
const TTL = 30 * 1000;

async function getSettings({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cachedAt < TTL) return cache;
  cache = (await PlatformSettings.getSingleton()).toObject();
  cachedAt = Date.now();
  return cache;
}

function invalidate() {
  cache = null;
  cachedAt = 0;
}

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Convenience fee + GST for a Pay Bill transaction.
 * @param base  billAmount − totalDiscount (the amount owed to the restaurant)
 * @param tip   voluntary tip (rides on top, untaxed)
 * Returns { convenienceFee, gstAmount, gstOnFeePercent, toPay,
 *           convenienceFeeOriginal, convenienceFeeWaived }.
 * When the admin waives the fee, convenienceFee/gstAmount are 0 and
 * convenienceFeeOriginal carries the struck-out amount for display.
 */
async function computeCharges(base, tip = 0) {
  const s = await getSettings();
  const b = Math.max(0, Number(base) || 0);
  const t = Math.max(0, Number(tip) || 0);

  let convenienceFee = 0;
  if (s.convenienceFeeEnabled && b > 0 && b >= (s.convenienceFeeMinBill || 0)) {
    if (s.convenienceFeeType === 'percent') {
      convenienceFee = (b * (s.convenienceFeeValue || 0)) / 100;
      if (s.convenienceFeeCap > 0) convenienceFee = Math.min(convenienceFee, s.convenienceFeeCap);
    } else {
      convenienceFee = s.convenienceFeeValue || 0;
    }
  }
  const convenienceFeeOriginal = r2(convenienceFee);
  const convenienceFeeWaived = Boolean(s.convenienceFeeWaived) && convenienceFeeOriginal > 0;
  convenienceFee = convenienceFeeWaived ? 0 : convenienceFeeOriginal;

  const gstOnFeePercent = s.gstOnFeePercent || 0;
  const gstAmount = r2((convenienceFee * gstOnFeePercent) / 100);
  const toPay = r2(b + convenienceFee + gstAmount + t);

  return { convenienceFee, gstAmount, gstOnFeePercent, toPay, convenienceFeeOriginal, convenienceFeeWaived };
}

/**
 * Hungora app discount: the admin's automatic, platform-funded discount for
 * paying through the app. Applied on what is left after any offer discount.
 * @param base          billAmount − offer discount
 * @param restaurantId  checked against the 'selected' restaurant list
 * Returns the discount in ₹ (0 when disabled, not eligible, or below the minimum bill).
 */
function appDiscountAppliesTo(s, restaurantId) {
  if (!s.appDiscountEnabled) return false;
  if (s.appDiscountScope !== 'selected') return true;
  const id = String(restaurantId || '');
  return (s.appDiscountRestaurants || []).some((r) => String(r) === id);
}

async function computeAppDiscount(base, restaurantId) {
  const s = await getSettings();
  const b = Math.max(0, Number(base) || 0);
  if (!appDiscountAppliesTo(s, restaurantId) || b <= 0 || b < (s.appDiscountMinBill || 0)) return 0;

  let d;
  if (s.appDiscountType === 'flat') {
    d = s.appDiscountValue || 0;
  } else {
    d = (b * (s.appDiscountValue || 0)) / 100;
    if (s.appDiscountCap > 0) d = Math.min(d, s.appDiscountCap);
  }
  return r2(Math.min(Math.max(0, d), b));
}

// Human label for the bill summary, e.g. "10% off · up to ₹50" / "Flat ₹40 off".
function appDiscountLabel(s) {
  if (s.appDiscountType === 'flat') return `Flat ₹${s.appDiscountValue || 0} off`;
  const cap = s.appDiscountCap > 0 ? ` · up to ₹${s.appDiscountCap}` : '';
  return `${s.appDiscountValue || 0}% off${cap}`;
}

/**
 * Folds the app discount into an offer's discountBreakup as platform-funded.
 * Returns { discountBreakup, appDiscount, appDiscountLabel }.
 */
async function withAppDiscount(amount, discountBreakup, restaurantId) {
  const appDiscount = await computeAppDiscount(amount - discountBreakup.total, restaurantId);
  if (!appDiscount) return { discountBreakup, appDiscount: 0, appDiscountLabel: '' };
  return {
    appDiscount,
    appDiscountLabel: appDiscountLabel(await getSettings()),
    discountBreakup: {
      ...discountBreakup,
      platformFunded: r2(discountBreakup.platformFunded + appDiscount),
      total:          r2(discountBreakup.total + appDiscount),
    },
  };
}

module.exports = {
  getSettings, invalidate, computeCharges, appDiscountAppliesTo, computeAppDiscount, withAppDiscount, r2,
};
