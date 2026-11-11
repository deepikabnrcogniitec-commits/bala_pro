export {
  COLOR, SPACING, RADII, ELEVATION, MOTION, GRADIENT,
  SCREEN_WIDTH, scale,
} from './tokens';
export { FONT, text } from './typography';

import { COLOR, SPACING, RADII, ELEVATION, MOTION, GRADIENT } from './tokens';
import { FONT, text } from './typography';

// Single object for ergonomic access: `theme.color.terracotta`, `theme.space.md`.
export const theme = {
  color: COLOR,
  space: SPACING,
  radii: RADII,
  elevation: ELEVATION,
  motion: MOTION,
  gradient: GRADIENT,
  font: FONT,
  text,
};

export default theme;
