import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLOR, SPACING, RADII, ELEVATION, text } from '../../theme';
import PhotoImage from '../ui/PhotoImage';

const THUMB = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&q=70';

/** Compact "rate your visit" row. */
export default function RateOrderCard({
  title = 'Overfresh — Baking Studio',
  subtitle = 'Rate your visit',
  image = THUMB,
  onClose,
  onRate,
}) {
  const [rating, setRating] = useState(0);

  return (
    <View style={[styles.card, ELEVATION.sm]}>
      <PhotoImage uri={image} style={styles.thumb} radius={RADII.sm} />
      <View style={styles.mid}>
        <Text style={text.caption}>{subtitle}</Text>
        <Text style={text.bodyStrong} numberOfLines={1}>{title}</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} hitSlop={4} onPress={() => { setRating(n); onRate && onRate(n); }}>
              <Ionicons
                name={n <= rating ? 'star' : 'star-outline'}
                size={18}
                color={n <= rating ? COLOR.gold : COLOR.border}
              />
            </Pressable>
          ))}
        </View>
      </View>
      <Pressable hitSlop={8} onPress={onClose}>
        <Ionicons name="close" size={18} color={COLOR.inkFaint} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLOR.surface,
    borderRadius: RADII.lg,
    padding: SPACING.sm,
  },
  thumb: { width: 54, height: 54 },
  mid: { flex: 1, gap: 2 },
  stars: { flexDirection: 'row', gap: 4, marginTop: 4 },
});
