import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { HOME_COLORS, HOME_FONTS, scale, REEL, DEPTH } from './homeTheme';

/**
 * Is the expo-video native module actually in this binary?
 * `require` of the JS package always works; the native module only exists
 * in a dev/production build that included it. Until then we fall back to
 * the poster image with a slow Ken Burns pan so the card still feels alive.
 *
 * `ReelVideoLayer` is required lazily *only* when the module is present —
 * importing it eagerly would evaluate `expo-video` and crash on a binary
 * without it (e.g. Expo Go).
 */
let ReelVideoLayer = null;
try {
  // eslint-disable-next-line global-require
  const { requireOptionalNativeModule } = require('expo-modules-core');
  if (requireOptionalNativeModule?.('ExpoVideo')) {
    // eslint-disable-next-line global-require
    ReelVideoLayer = require('./ReelVideoLayer').default;
  }
} catch (e) {
  ReelVideoLayer = null;
}
const VIDEO_OK = !!ReelVideoLayer;

const AnimatedImage = Animated.createAnimatedComponent(Image);

/**
 * A single "food in motion" card in the hero rail.
 *  - Looping muted clip (poster + Ken Burns underneath as fallback)
 *  - 3D perspective tilt + parallax driven by the rail's scroll position:
 *    the centred card faces the viewer, neighbours rotate away in depth
 *  - Glass info panel with rating, distance and a Book Table CTA
 */
export default function FoodReelCard({
  item,
  index,
  scrollX,
  isActive,
  onPressBook,
  onPress,
}) {
  const kb = useSharedValue(0);

  useEffect(() => {
    kb.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, []);

  const posterStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(kb.value, [0, 1], [1.06, 1.16]) },
      { translateX: interpolate(kb.value, [0, 1], [-scale(8), scale(8)]) },
    ],
  }));

  const cardStyle = useAnimatedStyle(() => {
    const input = [
      (index - 1) * REEL.SPACING,
      index * REEL.SPACING,
      (index + 1) * REEL.SPACING,
    ];
    return {
      opacity: interpolate(scrollX.value, input, [0.45, 1, 0.45], Extrapolation.CLAMP),
      transform: [
        { perspective: 1000 },
        { scale: interpolate(scrollX.value, input, [0.82, 1, 0.82], Extrapolation.CLAMP) },
        { rotateY: `${interpolate(scrollX.value, input, [32, 0, -32], Extrapolation.CLAMP)}deg` },
        { translateY: interpolate(scrollX.value, input, [scale(30), 0, scale(30)], Extrapolation.CLAMP) },
      ],
    };
  });

  const glareStyle = useAnimatedStyle(() => {
    const input = [
      (index - 1) * REEL.SPACING,
      index * REEL.SPACING,
      (index + 1) * REEL.SPACING,
    ];
    return {
      opacity: interpolate(scrollX.value, input, [0.55, 0, 0.55], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(scrollX.value, input, [-REEL.CARD_W, 0, REEL.CARD_W], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View style={[styles.wrap, cardStyle]}>
      <Pressable style={styles.card} onPress={onPress}>
        <AnimatedImage
          source={{ uri: item.poster }}
          style={[StyleSheet.absoluteFill, posterStyle]}
          contentFit="cover"
          transition={200}
        />

        {VIDEO_OK ? <ReelVideoLayer uri={item.video} isActive={isActive} /> : null}

        {/* cinematic vignette */}
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.15)', 'rgba(10,0,6,0.92)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* moving specular highlight — sells the 3D tilt */}
        <Animated.View style={[styles.glare, glareStyle]} pointerEvents="none">
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.28)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* top row: LIVE dot + distance */}
        <View style={styles.topRow}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>SERVING NOW</Text>
          </View>
          <View style={styles.distancePill}>
            <Ionicons name="navigate" size={scale(11)} color="#fff" />
            <Text style={styles.distanceText}>{item.distance}</Text>
          </View>
        </View>

        {/* bottom glass panel */}
        <View style={styles.info}>
          <Text style={styles.dish} numberOfLines={1}>{item.dish}</Text>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>

          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={scale(11)} color="#fff" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
            <Text style={styles.priceTag} numberOfLines={1}>{item.priceTag}</Text>
          </View>

          <Pressable onPress={onPressBook} style={styles.cta}>
            <LinearGradient
              colors={item.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaInner}
            >
              <Text style={styles.ctaText}>Book a Table</Text>
              <Ionicons name="arrow-forward" size={scale(15)} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: REEL.CARD_W,
    height: REEL.CARD_H,
    marginRight: REEL.SPACING - REEL.CARD_W,
    ...DEPTH.high,
  },
  card: {
    flex: 1,
    borderRadius: scale(30),
    overflow: 'hidden',
    backgroundColor: '#1A0010',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  glare: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: scale(120),
  },
  topRow: {
    position: 'absolute',
    top: scale(16),
    left: scale(16),
    right: scale(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  liveDot: {
    width: scale(7),
    height: scale(7),
    borderRadius: scale(4),
    backgroundColor: '#39E27D',
  },
  liveText: {
    color: '#fff',
    fontSize: scale(10),
    letterSpacing: 0.8,
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  distanceText: {
    color: '#fff',
    fontSize: scale(11),
    fontFamily: HOME_FONTS.semiBold,
    fontWeight: '600',
  },
  info: {
    position: 'absolute',
    left: scale(14),
    right: scale(14),
    bottom: scale(14),
    padding: scale(14),
    borderRadius: scale(22),
    backgroundColor: 'rgba(28,4,18,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  dish: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: scale(12),
    letterSpacing: 0.3,
    fontFamily: HOME_FONTS.semiBold,
    fontWeight: '600',
  },
  name: {
    color: '#fff',
    fontSize: scale(19),
    marginTop: scale(2),
    fontFamily: HOME_FONTS.extraBold,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginTop: scale(8),
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(8),
    backgroundColor: HOME_COLORS.green,
  },
  ratingText: {
    color: '#fff',
    fontSize: scale(12),
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
  },
  priceTag: {
    flex: 1,
    color: 'rgba(255,255,255,0.82)',
    fontSize: scale(12),
    fontFamily: HOME_FONTS.medium,
  },
  cta: {
    marginTop: scale(12),
    borderRadius: scale(14),
    overflow: 'hidden',
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(12),
  },
  ctaText: {
    color: '#fff',
    fontSize: scale(14),
    letterSpacing: 0.3,
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
  },
});
