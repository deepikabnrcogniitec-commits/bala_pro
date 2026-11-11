import { Dimensions } from 'react-native';

const { width: WINDOW_WIDTH } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Hungora design tokens — light system, cool "logo blue" shade.
// Soft blue-tinted surfaces + layered elevation for a subtle 3D feel.
// Accent is the logo blue (#0C2F4E) with a gold highlight.
// ---------------------------------------------------------------------------

export const COLOR = {
  // Surfaces — blue-washed so the app reads as one cool tone; white cards
  // lift clearly off the deeper blue ground.
  bg: '#D8E5F4', // app background — blue shade (from logo blue)
  surface: '#FFFFFF', // cards, sheets — sit "above" the blue ground
  surfaceAlt: '#CEDEF0', // subtly raised panels
  sunken: '#C8DAED', // inputs, wells, skeleton base

  // Full logo blue — used as the Home screen ground, with light text on top
  navy: '#0C2F4E',
  onNavy: '#EEF4FB', // primary text / icons on navy
  onNavySoft: '#9DB4CB', // secondary text on navy
  onNavyFill: 'rgba(255,255,255,0.10)', // translucent chips / buttons on navy

  // Text — cool-tinted neutrals
  ink: '#12242F', // primary
  inkSoft: '#566673', // secondary
  inkFaint: '#8B9EAC', // tertiary / disabled / placeholder
  onColor: '#FFFFFF', // text/icon on accent fills

  // Lines
  hairline: '#C9DAEB',
  border: '#B4CADF',

  // Accents — primary is the logo blue (#0C2F4E). `terracotta*` names kept for
  // back-compat but now resolve to blue; `blue*` are the canonical names.
  blue: '#0C2F4E',
  bluePressed: '#081E33',
  blueTint: '#DBE7F4', // light wash for selected chips / active rows
  blueSoft: '#1C4E70', // mid-blue for secondary emphasis
  terracotta: '#0C2F4E',
  terracottaPressed: '#081E33',
  terracottaTint: '#DBE7F4',
  wine: '#1C4E70',
  wineTint: '#E4EEF4',
  gold: '#C8952B', // logo gold — ratings / premium touches
  goldTint: '#F7EDD8',

  // Semantic
  success: '#2E7D5B',
  successTint: '#E2F0E9',
  warning: '#C8952B',
  warningTint: '#F7EDD8',
  error: '#C0392B',
  errorTint: '#F7E3E0',
  info: '#1C4E70',

  // Photography
  scrim: 'rgba(20,12,8,0.55)',
  scrimSoft: 'rgba(20,12,8,0.28)',
  scrimStrong: 'rgba(20,12,8,0.78)',
};

export const SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
};

export const RADII = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

// Blue-tinted, layered elevation — cards lift off the light-blue ground for a
// subtle 3D feel. Android falls back to `elevation`.
export const ELEVATION = {
  none: {},
  sm: {
    shadowColor: '#0C2F4E',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  md: {
    shadowColor: '#0C2F4E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 9,
  },
  lg: {
    shadowColor: '#0C2F4E',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.22,
    shadowRadius: 40,
    elevation: 20,
  },
};

export const MOTION = {
  fast: 160,
  base: 240,
  slow: 360,
  spring: { damping: 15, stiffness: 180, mass: 1 },
  springSoft: { damping: 18, stiffness: 120 },
};

// Scale spacing / font sizes across device widths against a 390pt reference.
const BASE_WIDTH = 390;
export const SCREEN_WIDTH = WINDOW_WIDTH;
export const scale = (size) => Math.round((WINDOW_WIDTH / BASE_WIDTH) * size);

export const GRADIENT = {
  scrimDown: ['rgba(8,15,25,0)', 'rgba(8,15,25,0.78)'],
  scrimUp: ['rgba(8,15,25,0.55)', 'rgba(8,15,25,0)'],
  blue: ['#1B5E8F', '#0C2F4E'],
  terracotta: ['#1B5E8F', '#0C2F4E'],
  wine: ['#246C97', '#123E5C'],
  gold: ['#E0B15A', '#C8952B'],
};
