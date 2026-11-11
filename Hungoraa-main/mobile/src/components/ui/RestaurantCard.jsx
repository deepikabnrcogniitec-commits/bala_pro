import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLOR, RADII, SPACING, ELEVATION, text, FONT } from '../../theme';
import PhotoImage from './PhotoImage';
import Rating from './Rating';
import Tag from './Tag';

/**
 * Photo-forward restaurant card. Accepts a `toRestaurantCard()` item.
 * `layout`: 'feature' (wide, for rails) | 'full' (full-width list)
 */
export default function RestaurantCard({
  item,
  onPress,
  isFavorite,
  onToggleFavorite,
  layout = 'feature',
  style,
}) {
  const full = layout === 'full';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        full ? styles.full : styles.feature,
        ELEVATION.sm,
        pressed && styles.pressed,
        style,
      ]}
    >
      <PhotoImage uri={item.image} style={[styles.photo, full && styles.photoFull]} radius={0} scrim scrimHeight="60%">
        <View style={styles.photoTop}>
          {item.discount ? <Tag label={item.discount} tone="terracotta" style={styles.discount} /> : <View />}
          {onToggleFavorite ? (
            <Pressable onPress={() => onToggleFavorite(item)} hitSlop={8} style={styles.heart}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={18}
                color={isFavorite ? COLOR.terracotta : '#FFFFFF'}
              />
            </Pressable>
          ) : null}
        </View>

        {item.isOpen === false ? (
          <View style={styles.closed}><Text style={styles.closedText}>CLOSED NOW</Text></View>
        ) : null}

        <View style={styles.photoBottom}>
          <Rating value={item.rating} variant="solid" />
          {item.priceForTwo ? <Text style={styles.priceOnPhoto}>{item.priceForTwo} for two</Text> : null}
        </View>
      </PhotoImage>

      <View style={styles.body}>
        <Text style={text.title} numberOfLines={1}>{item.name}</Text>
        <Text style={[text.caption, styles.meta]} numberOfLines={1}>
          {item.category}{item.time ? `  ·  ${item.time}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLOR.surface,
    borderRadius: RADII.lg,
    overflow: 'hidden',
  },
  feature: { width: 230 },
  full: { width: '100%' },
  pressed: { opacity: 0.95, transform: [{ scale: 0.99 }] },
  photo: { height: 150, width: '100%' },
  photoFull: { height: 172 },
  photoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.sm,
  },
  discount: {},
  heart: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(8,15,25,0.34)',
    alignItems: 'center', justifyContent: 'center',
  },
  closed: {
    position: 'absolute',
    top: 44, left: SPACING.sm,
    backgroundColor: 'rgba(8,15,25,0.72)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADII.xs,
  },
  closedText: { fontFamily: FONT.semiBold, fontSize: 10, letterSpacing: 0.6, color: '#FFFFFF' },
  photoBottom: {
    position: 'absolute',
    left: SPACING.sm, right: SPACING.sm, bottom: SPACING.sm,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  priceOnPhoto: { fontFamily: FONT.medium, fontSize: 12, color: 'rgba(255,255,255,0.92)' },
  body: { padding: SPACING.sm, paddingTop: 10 },
  meta: { marginTop: 3 },
});
