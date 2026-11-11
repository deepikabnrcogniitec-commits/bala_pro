import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate, Easing,
} from 'react-native-reanimated';
import { COLOR, RADII } from '../../theme';

/** Shimmering placeholder block (warm base). */
export function Skeleton({ width = '100%', height = 16, radius = RADII.xs, style }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [p]);
  const anim = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 1], [0.4, 0.85]) }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: COLOR.sunken }, anim, style]}
    />
  );
}

/** A few stacked lines / a card block. */
export function SkeletonCard({ style }) {
  return (
    <Animated.View style={[styles.card, style]}>
      <Skeleton height={150} radius={RADII.md} />
      <Skeleton width="70%" height={16} style={styles.mt12} />
      <Skeleton width="45%" height={12} style={styles.mt8} />
    </Animated.View>
  );
}

export function SkeletonRow({ style }) {
  return (
    <Animated.View style={[styles.row, style]}>
      <Skeleton width={72} height={72} radius={RADII.sm} />
      <Animated.View style={styles.rowText}>
        <Skeleton width="60%" height={15} />
        <Skeleton width="40%" height={12} style={styles.mt8} />
        <Skeleton width="30%" height={12} style={styles.mt8} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 0 },
  mt12: { marginTop: 12 },
  mt8: { marginTop: 8 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  rowText: { flex: 1, justifyContent: 'center' },
});

export default Skeleton;
