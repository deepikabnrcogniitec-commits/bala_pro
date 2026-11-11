// Back-compat shim — legacy FONTS names now resolve to the loaded Inter / Fraunces
// faces (see src/theme/typography.js + App.jsx useFonts). New screens should use
// `text` presets and `FONT` from `src/theme` instead.
import { FONT } from '../theme';

export const FONTS = {
  regular: FONT.regular,
  medium: FONT.medium,
  semiBold: FONT.semiBold,
  bold: FONT.bold,
  extraBold: FONT.bold,
  // serif display faces
  display: FONT.display,
  displayMedium: FONT.displayMedium,
  displayRegular: FONT.displayRegular,
  displayBold: FONT.displayBold,
};

export const SIZES = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  h3: 20,
  h2: 24,
  h1: 28,
  display: 32,
};

export const LINE_HEIGHTS = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,
};
