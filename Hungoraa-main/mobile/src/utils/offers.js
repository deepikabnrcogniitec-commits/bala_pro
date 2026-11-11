// Shared offer helpers — label formatting + a client-side mirror of the backend
// Offer.calculateDiscount() so screens can preview a discount instantly as the
// user types, before any server round-trip.

export const isPayBillOffer = (o) => !o?.applicableTo?.length || o.applicableTo.includes('pay_bill');
export const isBookingOffer = (o) => !o?.applicableTo?.length || o.applicableTo.includes('booking');

export const offerValueLabel = (o) => {
  if (!o) return '';
  if (o.type === 'percentage') return `${o.discountValue}% Off${o.maxDiscount ? ` up to ₹${o.maxDiscount}` : ''}`;
  if (o.type === 'flat') return `Flat ₹${o.discountValue} Off`;
  if (o.type === 'bogo') return 'Buy 1 Get 1 Free';
  if (o.type === 'happy_hours') return 'Happy Hours';
  if (o.type === 'early_bird') return 'Early Bird Deal';
  return (o.type?.replace(/_/g, ' ') || 'Special offer');
};

export const offerFunderLabel = (o) => (o?.fundedBy === 'bank' ? 'Bank Offer'
  : o?.fundedBy === 'platform' ? 'Hungora Offer'
    : 'Restaurant Offer');

// Rupee value of an offer on a given bill. Mirrors backend logic incl. the
// minimum-order gate and the percentage cap. Returns 0 when it can't be
// previewed (bogo / free_item) or the bill is below the minimum.
export const computeDiscount = (offer, amount) => {
  const amt = Number(amount) || 0;
  if (!offer || amt <= 0) return 0;
  if (amt < (offer.minOrderAmount || 0)) return 0;

  let d = 0;
  if (offer.type === 'percentage') {
    d = (amt * offer.discountValue) / 100;
    if (offer.maxDiscount) d = Math.min(d, offer.maxDiscount);
  } else if (offer.type === 'flat') {
    d = Math.min(offer.discountValue, amt);
  } else {
    return 0;
  }
  return Math.round(d);
};

export const rankOffers = (offers, amount) => (offers || [])
  .map((offer) => ({ offer, discount: computeDiscount(offer, amount) }))
  .sort((a, b) => b.discount - a.discount);

export const bestOffer = (offers, amount) => {
  const ranked = rankOffers(offers, amount).filter((x) => x.discount > 0);
  return ranked[0] || null;
};
