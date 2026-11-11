import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { HOME_COLORS, HOME_FONTS, scale, SCREEN_WIDTH, DEPTH } from './homeTheme';

/**
 * Floating promo card inside the light content sheet.
 * Left-aligned headline + a white BOOK NOW pill; abstract shapes for depth.
 */
export default function PromoBanner({
  eyebrow = 'Feast on your',
  headline = 'Cravings',
  sub = 'Up to 60% off on dine-in, tonight only',
  cta = 'BOOK NOW',
  onPress,
}) {
  return (
    <LinearGradient
      colors={['#3A0022', '#5C0038', '#7A0048']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.shapeCircle} />
      <View style={styles.shapeDiamond} />

      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.sub}>{sub}</Text>

      <Pressable style={styles.ctaPill} onPress={onPress}>
        <Text style={styles.ctaText}>{cta}</Text>
        <Ionicons name="arrow-forward" size={scale(13)} color={HOME_COLORS.magenta} />
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - scale(32),
    alignSelf: 'center',
    borderRadius: scale(26),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    padding: scale(20),
    ...DEPTH.mid,
  },
  shapeCircle: {
    position: 'absolute',
    top: scale(-26),
    right: scale(-26),
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  shapeDiamond: {
    position: 'absolute',
    bottom: scale(-34),
    right: scale(14),
    width: scale(74),
    height: scale(74),
    backgroundColor: 'rgba(255,217,26,0.12)',
    transform: [{ rotate: '45deg' }],
  },
  eyebrow: {
    fontSize: scale(13),
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
    color: HOME_COLORS.goldSoft,
  },
  headline: {
    fontSize: scale(34),
    lineHeight: scale(36),
    marginTop: scale(2),
    fontFamily: HOME_FONTS.extraBold,
    fontWeight: '800',
    color: HOME_COLORS.gold,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  sub: {
    marginTop: scale(6),
    fontSize: scale(12),
    fontFamily: HOME_FONTS.regular,
    color: 'rgba(255,255,255,0.9)',
  },
  ctaPill: {
    marginTop: scale(12),
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: HOME_COLORS.white,
  },
  ctaText: {
    fontSize: scale(12),
    fontFamily: HOME_FONTS.extraBold,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: HOME_COLORS.magenta,
  },
});
