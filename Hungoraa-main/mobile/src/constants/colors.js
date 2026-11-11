// Back-compat shim — maps the legacy COLORS/GRADIENTS names onto the new
// "elegant EasyDiner" light design system in `src/theme`. Screens that have not
// yet been redesigned keep working (and stay visually coherent) through this;
// redesigned screens import from `src/theme` directly.
import { COLOR, GRADIENT } from '../theme';

export const COLORS = {
  primary: COLOR.blue,
  primaryDark: COLOR.bluePressed,
  primaryLight: COLOR.blueSoft,
  primaryBg: COLOR.blueTint,

  secondary: COLOR.wine,
  secondaryLight: '#2E7DA8',

  accent: COLOR.gold,

  black: COLOR.ink,
  dark: COLOR.ink,
  darkGray: COLOR.inkSoft,
  gray: COLOR.inkSoft,
  lightGray: COLOR.inkFaint,
  silver: COLOR.hairline,
  border: COLOR.border,

  background: COLOR.bg,
  surface: COLOR.surface,
  card: COLOR.surface,
  sunken: COLOR.sunken,
  white: COLOR.surface,

  success: COLOR.success,
  warning: COLOR.warning,
  error: COLOR.error,
  info: COLOR.info,

  rating: COLOR.gold,
  overlay: COLOR.scrim,
  overlayLight: COLOR.scrimSoft,
};

export const GRADIENTS = {
  primary: GRADIENT.terracotta,
  dark: GRADIENT.wine,
  header: GRADIENT.wine,
  card: GRADIENT.scrimDown,
  success: ['#2E7D5B', '#3E9E76'],
};
