import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * A soft, looping "glow" that radiates out from behind a circular button.
 * Render one or more (with staggered `delay`) directly inside a centered,
 * circle-sized container, *before* the button itself so they sit behind it.
 */
export default function PulseGlow({ color, size = 52, delay = 0, duration = 1800 }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [progress, delay, duration]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] });
  const opacity = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.45, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}
