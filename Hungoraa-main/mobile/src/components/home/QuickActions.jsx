import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADII, FONT } from '../../theme';

const NAVY = '#0C2F4E';

const ACTIONS = [
  { id: 'book', label: 'Book a Table', hint: 'Reserve ahead', icon: 'calendar-outline', variant: 'navy' },
  { id: 'dinein', label: 'Dine In', hint: 'Walk in & pay bill', icon: 'restaurant-outline', variant: 'navy' },
];

/**
 * The two primary diner actions as solid logo-blue blocks with white text.
 * (The `white` variant is kept for an inverse card if one is ever needed.)
 */
export default function QuickActions({ onPress }) {
  return (
    <View style={styles.row}>
      {ACTIONS.map((a, i) => {
        const navy = a.variant === 'navy';
        const fg = navy ? '#FFFFFF' : NAVY;
        return (
          <Animated.View
            key={a.id}
            entering={FadeInDown.duration(500).delay(60 + i * 90)}
            style={styles.cell}
          >
            <Pressable
              style={({ pressed }) => [
                styles.card,
                navy ? styles.navy : styles.white,
                pressed && styles.pressed,
              ]}
              onPress={() => onPress?.(a.id)}
              android_ripple={{ color: navy ? 'rgba(255,255,255,0.12)' : 'rgba(12,47,78,0.08)' }}
            >
              <Ionicons name={a.icon} size={22} color={fg} />
              <Text style={[styles.label, { color: fg }]}>{a.label}</Text>
              <View style={styles.hintRow}>
                <Text style={[styles.hint, { color: navy ? 'rgba(255,255,255,0.75)' : 'rgba(12,47,78,0.6)' }]}>
                  {a.hint}
                </Text>
                <Ionicons name="arrow-forward" size={13} color={navy ? 'rgba(255,255,255,0.9)' : NAVY} />
              </View>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg, // clear of the hero's curve
    marginBottom: SPACING.xs,
  },
  cell: {
    flex: 1,
    borderRadius: RADII.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 7,
  },
  card: {
    borderRadius: RADII.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    gap: 6,
  },
  navy: { backgroundColor: NAVY, borderColor: 'rgba(255,255,255,0.18)' },
  // hairline navy edge — the card sits on the white page, so it needs an edge to read
  white: { backgroundColor: '#FFFFFF', borderColor: 'rgba(12,47,78,0.12)' },
  pressed: { transform: [{ scale: 0.965 }], opacity: 0.94 },
  label: {
    fontFamily: FONT.semiBold,
    fontSize: 15,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hint: {
    fontFamily: FONT.regular,
    fontSize: 11,
  },
});
