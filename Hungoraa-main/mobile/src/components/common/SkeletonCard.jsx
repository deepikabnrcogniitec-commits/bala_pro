import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS, BORDER_RADIUS } from '../../constants';

export default function SkeletonCard({ width = 220, height = 200, borderRadius = 12 }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View style={[styles.skeleton, { width, height, borderRadius, opacity }]} />
  );
}

const styles = StyleSheet.create({
  skeleton: { backgroundColor: COLORS.silver },
});
