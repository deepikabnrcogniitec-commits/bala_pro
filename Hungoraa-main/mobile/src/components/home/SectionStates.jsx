import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { HOME_COLORS, HOME_FONTS, scale } from './homeTheme';

/** A shimmering placeholder block. */
export function Skeleton({ width, height, radius = scale(12), style, dark = false }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 1], [0.35, 0.8]) }));
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)' },
        anim,
        style,
      ]}
    />
  );
}

/** Row of skeleton cards for a horizontal rail. */
export function CardRailSkeleton({ count = 3, cardW = scale(210), cardH = scale(224), dark = false }) {
  return (
    <View style={styles.rail}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} width={cardW} height={cardH} radius={scale(24)} dark={dark} />
      ))}
    </View>
  );
}

export function SectionError({ message = 'Couldn’t load this', onRetry, dark = false }) {
  return (
    <View style={styles.state}>
      <Ionicons name="cloud-offline-outline" size={scale(22)} color={HOME_COLORS.mutedInk} />
      <Text style={[styles.stateText, dark && styles.stateTextDark]}>{message}</Text>
      {onRetry ? (
        <Pressable style={[styles.retry, dark && styles.retryDark]} onPress={onRetry}>
          <Ionicons name="refresh" size={scale(13)} color="#E7B8D2" />
          <Text style={[styles.retryText, dark && { color: '#fff' }]}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SectionEmpty({ message = 'Nothing here yet', icon = 'restaurant-outline', dark = false }) {
  return (
    <View style={styles.state}>
      <Ionicons name={icon} size={scale(22)} color={HOME_COLORS.mutedInk} />
      <Text style={[styles.stateText, dark && styles.stateTextDark]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    gap: scale(16),
    paddingHorizontal: scale(20),
    paddingVertical: scale(6),
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(28),
    paddingHorizontal: scale(20),
  },
  stateText: {
    fontSize: scale(13),
    fontFamily: HOME_FONTS.medium,
    color: HOME_COLORS.mutedInk,
    textAlign: 'center',
  },
  stateTextDark: { color: '#E7B8D2' },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  retryDark: { backgroundColor: 'rgba(255,255,255,0.12)' },
  retryText: {
    fontSize: scale(12),
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
    color: '#E7B8D2',
  },
});
