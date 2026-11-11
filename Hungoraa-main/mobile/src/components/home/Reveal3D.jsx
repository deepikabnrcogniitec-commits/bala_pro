import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';

/**
 * Wraps content so it rises into place with a subtle 3D hinge on mount.
 * Used to stagger the home sections so the screen assembles itself.
 */
export default function Reveal3D({ children, delay = 0, style }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(
      delay,
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [
      { perspective: 800 },
      { translateY: interpolate(p.value, [0, 1], [34, 0]) },
      { rotateX: `${interpolate(p.value, [0, 1], [10, 0])}deg` },
      { scale: interpolate(p.value, [0, 1], [0.96, 1]) },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
