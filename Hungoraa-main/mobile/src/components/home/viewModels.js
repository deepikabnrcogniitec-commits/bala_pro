/**
 * Maps raw API documents to the shapes the home-screen components expect.
 * Keeps every component prop-driven and free of backend field names.
 */

const PRICE_LABEL = { $: '₹300', $$: '₹700', $$$: '₹1,400', $$$$: '₹2,500' };

export function restaurantImage(r) {
  if (!r) return null;
  const primary = r.images?.find((i) => i.isPrimary) || r.images?.[0];
  return primary?.url || r.logo?.url || null;
}

export function isOpenNow(r) {
  try {
    const now = new Date();
    const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const today = r?.operatingHours?.find((h) => h.day === day);
    if (!today) return true; // unknown → assume open
    if (today.isOpen === false) return false;
    const mins = now.getHours() * 60 + now.getMinutes();
    return (today.slots || []).some((s) => {
      const [oh, om] = String(s.open || '00:00').split(':').map(Number);
      const [ch, cm] = String(s.close || '23:59').split(':').map(Number);
      return mins >= oh * 60 + om && mins <= ch * 60 + cm;
    });
  } catch {
    return true;
  }
}

export function offerLabel(offer) {
  if (!offer) return null;
  if (offer.type === 'flat' || offer.type === 'flat_amount') {
    return { big: `₹${offer.discountValue} OFF`, sub: offer.minOrderAmount ? `ON ₹${offer.minOrderAmount}+` : 'FLAT' };
  }
  return {
    big: `${offer.discountValue}% OFF`,
    sub: offer.maxDiscount ? `UPTO ₹${offer.maxDiscount}` : 'DINE-IN',
  };
}

/** Build a { restaurantId: bestOffer } map from the active-offers list. */
export function offersByRestaurant(offers = []) {
  const map = {};
  for (const o of offers) {
    const rid = o.restaurant?._id || o.restaurant;
    if (!rid) continue;
    const cur = map[rid];
    if (!cur || (o.discountValue || 0) > (cur.discountValue || 0)) map[rid] = o;
  }
  return map;
}

/** Restaurant → RestaurantCard `item` */
export function toRestaurantCard(r, offerMap = {}) {
  const offer = offerMap[r._id];
  const label = offerLabel(offer);
  return {
    id: r._id,
    slug: r.slug,
    name: r.name,
    image: restaurantImage(r),
    rating: (r.averageRating || 0).toFixed(1),
    reviewCount: r.totalReviews || 0,
    time: r.address?.city ? `${r.address.city}` : 'Dine Out',
    category: r.cuisine?.slice(0, 2).join(' · ') || r.categories?.[0] || 'Restaurant',
    discount: label?.big || null,
    discountSub: label?.sub || null,
    priceForTwo: r.costForTwo ? `₹${r.costForTwo}` : PRICE_LABEL[r.priceRange] || null,
    isOpen: isOpenNow(r),
    tags: r.tags || [],
    raw: r,
  };
}

/** Restaurant → FoodReelCard `item` (hero reel) */
export function toReel(r, offerMap = {}) {
  const offer = offerMap[r._id];
  return {
    id: r._id,
    slug: r.slug,
    name: r.name,
    dish: r.cuisine?.[0] ? `${r.cuisine[0]} · Chef's picks` : 'Now serving',
    rating: (r.averageRating || 0).toFixed(1),
    distance: r.address?.city || 'Nearby',
    priceTag: r.costForTwo ? `Table for 2 · ₹${r.costForTwo}` : 'Book a table',
    accent: ['#1B5E8F', '#0C2F4E'],
    offer: offer ? offerLabel(offer)?.big : null,
    poster: restaurantImage(r),
    video: null, // real reel clips are added per-restaurant later; poster + Ken Burns until then
  };
}

/** Offer → PromoCarousel slide */
export function toPromo(offer) {
  const pct = offer.type === 'percentage' || !offer.type;
  return {
    id: offer._id,
    title: offer.title,
    subtitle: offer.description
      || (offer.restaurant?.name ? `at ${offer.restaurant.name}` : 'Selected restaurants'),
    discount: pct ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`,
    promoCode: offer.code || null,
    restaurantId: offer.restaurant?._id || offer.restaurant || null,
    restaurantName: offer.restaurant?.name || null,
    // The banner uploaded for this offer (show it edge-to-edge). Falls back to a
    // logo / stock photo only for the muted gradient-card treatment.
    bannerImage: offer.image?.url || null,
    image: offer.image?.url || offer.restaurant?.logo?.url || restaurantImage(offer.restaurant) || null,
    featured: !!offer.isFeatured,
    minOrder: offer.minOrderAmount || 0,
    maxDiscount: offer.maxDiscount || 0,
    validTo: offer.validTo,
    gradient: pickGradient(offer._id),
  };
}

const GRADIENTS = [
  ['#1B5E8F', '#0C2F4E'],
  ['#2E6E97', '#12405F'],
  ['#164A72', '#0A2740'],
  ['#3B7DA3', '#164A72'],
];
function pickGradient(id = '') {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export function greetingForNow(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}
