import { StyleSheet } from 'react-native';
import { COLOR } from './tokens';

// Font family keys — must match the keys registered in App.jsx `useFonts`.
export const FONT = {
  // Fraunces — serif display, for headings / numerals with character
  display: 'Fraunces_600SemiBold',
  displayMedium: 'Fraunces_500Medium',
  displayRegular: 'Fraunces_400Regular',
  displayBold: 'Fraunces_700Bold',
  // Inter — UI / body
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

// Fallback stacks so text still renders if a face fails to load.
const SERIF_FB = 'serif';
const SANS_FB = 'System';

/**
 * Text style presets. Use as `style={[text.h1, { color: ... }]}` or spread.
 * Colour is included as a sensible default and can be overridden.
 */
export const text = StyleSheet.create({
  display: {
    fontFamily: FONT.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.3,
    color: COLOR.ink,
  },
  h1: {
    fontFamily: FONT.display,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.2,
    color: COLOR.ink,
  },
  h2: {
    fontFamily: FONT.display,
    fontSize: 20,
    lineHeight: 26,
    color: COLOR.ink,
  },
  h3: {
    fontFamily: FONT.displayMedium,
    fontSize: 17,
    lineHeight: 23,
    color: COLOR.ink,
  },
  title: {
    fontFamily: FONT.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: COLOR.ink,
  },
  bodyStrong: {
    fontFamily: FONT.semiBold,
    fontSize: 14,
    lineHeight: 21,
    color: COLOR.ink,
  },
  body: {
    fontFamily: FONT.regular,
    fontSize: 14,
    lineHeight: 21,
    color: COLOR.inkSoft,
  },
  bodyInk: {
    fontFamily: FONT.regular,
    fontSize: 14,
    lineHeight: 21,
    color: COLOR.ink,
  },
  caption: {
    fontFamily: FONT.regular,
    fontSize: 12,
    lineHeight: 16,
    color: COLOR.inkSoft,
  },
  captionStrong: {
    fontFamily: FONT.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: COLOR.ink,
  },
  overline: {
    fontFamily: FONT.semiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLOR.inkFaint,
  },
  button: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  link: {
    fontFamily: FONT.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: COLOR.terracotta,
  },
  price: {
    fontFamily: FONT.displayMedium,
    fontSize: 15,
    color: COLOR.ink,
  },
});

export { SERIF_FB, SANS_FB };
