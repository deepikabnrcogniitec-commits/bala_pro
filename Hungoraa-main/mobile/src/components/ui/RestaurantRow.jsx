import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLOR, RADII, SPACING, text, FONT } from '../../theme';
import PhotoImage from './PhotoImage';
import Rating from './Rating';

/** Compact horizontal list item — thumb + name + meta. */
export default function RestaurantRow({ item, onPress, isFavorite, onToggleFavorite, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
    >
      <PhotoImage uri={item.image} style={styles.thumb} radius={RADII.sm} />
      <View style={styles.body}>
        <Text style={text.title} numberOfLines={1}>{item.name}</Text>
        <Text style={[text.caption, styles.meta]} numberOfLines={1}>{item.category}</Text>
        <View style={styles.metaRow}>
          <Rating value={item.rating} size={12} />
          {item.priceForTwo ? (
            <>
              <View style={styles.dot} />
              <Text style={styles.small}>{item.priceForTwo} for two</Text>
            </>
          ) : null}
        </View>
        {item.time ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color={COLOR.inkFaint} />
            <Text style={styles.small}>{item.time}</Text>
            {item.isOpen === false ? <Text style={styles.closed}>· Closed</Text> : null}
          </View>
        ) : null}
      </View>
      {onToggleFavorite ? (
        <Pressable onPress={() => onToggleFavorite(item)} hitSlop={10} style={styles.heart}>
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorite ? COLOR.terracotta : COLOR.inkFaint}
          />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLOR.surface,
    borderRadius: RADII.md,
    padding: SPACING.sm,
  },
  pressed: { opacity: 0.9 },
  thumb: { width: 78, height: 78 },
  body: { flex: 1, gap: 3 },
  meta: {},
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  small: { fontFamily: FONT.regular, fontSize: 12, color: COLOR.inkSoft },
  closed: { fontFamily: FONT.medium, fontSize: 12, color: COLOR.error },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: COLOR.inkFaint },
  heart: { padding: 4, alignSelf: 'flex-start' },
});
