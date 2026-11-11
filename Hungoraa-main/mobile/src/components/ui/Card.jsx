import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { COLOR, RADII, ELEVATION, SPACING } from '../../theme';

/** White rounded surface with soft warm elevation. */
export default function Card({ children, onPress, style, padded = false, elevation = 'sm' }) {
  const inner = (
    <View
      style={[
        styles.card,
        ELEVATION[elevation],
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLOR.surface,
    borderRadius: RADII.lg,
    overflow: 'hidden',
  },
  padded: { padding: SPACING.md },
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
});
