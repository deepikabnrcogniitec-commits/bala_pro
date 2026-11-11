import { Dimensions } from 'react-native';
import { COLOR, FONT, GRADIENT } from '../../theme';

const { width: WINDOW_WIDTH } = Dimensions.get('window');

// Base guideline width (design reference). Scales the pixel spec across
// Android devices so proportions stay constant.
const BASE_WIDTH = 390;
export const SCREEN_WIDTH = WINDOW_WIDTH;
export const SCREEN_HEIGHT = Dimensions.get('window').height;
export const scale = (size) => Math.round((WINDOW_WIDTH / BASE_WIDTH) * size);

// HOME_COLORS is kept as a name-compatible surface over the "elegant EasyDiner"
// light system in src/theme, so the existing home components render light
// while they are reskinned.
export const HOME_COLORS = {
  // legacy names → light values
  primaryBurgundy: COLOR.wine,
  darkBurgundy: COLOR.wine,
  headerGradient: GRADIENT.terracotta,
  magenta: COLOR.terracotta,
  deepMagenta: COLOR.terracottaPressed,
  orange: COLOR.terracotta,
  primaryText: COLOR.ink,
  secondaryText: COLOR.inkSoft,
  lightBg: COLOR.bg,
  white: COLOR.surface,
  accentYellow: COLOR.gold,
  green: COLOR.success,
  searchField: COLOR.sunken,
  subtitleGray: COLOR.inkFaint,
  tabInactiveText: COLOR.inkFaint,
  categoryActive: COLOR.terracottaTint,
  categoryInactive: COLOR.inkFaint,
  pillUnderline: COLOR.terracotta,

  // redesign tokens
  ink: COLOR.ink,
  bg: COLOR.bg,
  worldGradient: [COLOR.bg, COLOR.surfaceAlt, COLOR.bg],
  glowOrange: 'rgba(224,86,63,0.10)',
  glowPink: 'rgba(107,31,58,0.08)',
  gold: COLOR.gold,
  goldSoft: COLOR.goldTint,
  rose: COLOR.wine,
  sheetBg: COLOR.bg,
  sheetSurface: COLOR.surface,
  sheetInk: COLOR.ink,
  mutedInk: COLOR.inkSoft,
  hairline: COLOR.hairline,
  ctaGradient: GRADIENT.terracotta,
};

export const HOME_FONTS = {
  regular: FONT.regular,
  medium: FONT.medium,
  semiBold: FONT.semiBold,
  bold: FONT.bold,
  extraBold: FONT.bold,
  display: FONT.display,
  displayMedium: FONT.displayMedium,
};

/**
 * Layered elevation — warm-tinted ambient shadow so cards read as floating
 * above the cream surface.
 */
export const DEPTH = {
  low: {
    shadowColor: '#2B1B12',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  mid: {
    shadowColor: '#2B1B12',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 12,
  },
  high: {
    shadowColor: '#2B1B12',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.20,
    shadowRadius: 40,
    elevation: 22,
  },
};

export const REEL = {
  CARD_W: Math.round(WINDOW_WIDTH * 0.72),
  CARD_H: Math.round(WINDOW_WIDTH * 0.72 * 1.42),
  SPACING: Math.round(WINDOW_WIDTH * 0.72) + scale(18),
};

/**
 * Short looping "food in motion" clips for the hero rail.
 * `video` URLs are placeholders — swap for your own restaurant reels / CDN.
 */
export const FOOD_REELS = [
  {
    id: 'r1',
    name: 'Bawarchi Biryani House',
    dish: 'Dum Hyderabadi Biryani',
    rating: '4.6',
    distance: '1.2 km',
    priceTag: 'Table for 2 · ₹800',
    accent: ['#EC6A4E', '#D8492F'],
    video: 'https://assets.mixkit.co/videos/preview/mixkit-preparing-a-hamburger-1878-large.mp4',
    poster: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80',
  },
  {
    id: 'r2',
    name: 'Sotto Wood-Fire Pizza',
    dish: 'Burrata & Basil Margherita',
    rating: '4.8',
    distance: '0.6 km',
    priceTag: 'Table for 2 · ₹1,100',
    accent: ['#E0B15A', '#C8952B'],
    video: 'https://assets.mixkit.co/videos/preview/mixkit-hands-taking-a-slice-of-pizza-with-cheese-42111-large.mp4',
    poster: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
  },
  {
    id: 'r3',
    name: 'Kopi & Co. Roastery',
    dish: 'Single-Origin Pour Over',
    rating: '4.7',
    distance: '2.0 km',
    priceTag: 'Table for 2 · ₹450',
    accent: ['#8E5A2D', '#5A1730'],
    video: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-coffee-in-a-cup-seen-up-close-42315-large.mp4',
    poster: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
  },
  {
    id: 'r4',
    name: 'Trattoria Nonna',
    dish: 'Hand-Rolled Tagliatelle',
    rating: '4.5',
    distance: '3.4 km',
    priceTag: 'Table for 2 · ₹1,400',
    accent: ['#E23744', '#7A0048'],
    video: 'https://assets.mixkit.co/videos/preview/mixkit-spaghetti-with-tomato-sauce-and-basil-42212-large.mp4',
    poster: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=800&q=80',
  },
  {
    id: 'r5',
    name: 'The Grill Room',
    dish: 'Charcoal Reverse-Sear Steak',
    rating: '4.9',
    distance: '1.8 km',
    priceTag: 'Table for 2 · ₹2,200',
    accent: ['#D8492F', '#5A1730'],
    video: 'https://assets.mixkit.co/videos/preview/mixkit-chef-cooking-meat-on-a-grill-42423-large.mp4',
    poster: 'https://images.unsplash.com/photo-1546964124-0cce460f38ef?w=800&q=80',
  },
];
