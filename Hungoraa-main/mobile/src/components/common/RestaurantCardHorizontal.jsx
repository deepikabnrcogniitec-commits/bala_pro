import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, BORDER_RADIUS, SHADOW, SPACING } from '../../constants';

export default function RestaurantCardHorizontal({ restaurant, onPress, onSave }) {
  const primaryImage = restaurant.images?.[0]?.url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';
  const offer = restaurant.offers?.[0];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: primaryImage }} style={styles.image} contentFit="cover" transition={300} />
        {offer && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerText}>{offer.title}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
          {restaurant.isVerified && <Ionicons name="checkmark-circle" size={14} color={COLORS.info} />}
        </View>
        <Text style={styles.cuisine} numberOfLines={1}>
          {Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(' • ') : restaurant.cuisine}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.ratingChip}>
            <Ionicons name="star" size={11} color={COLORS.rating} />
            <Text style={styles.ratingText}>{restaurant.averageRating?.toFixed(1) || '4.0'}</Text>
            <Text style={styles.reviewCount}>({restaurant.totalReviews || 0})</Text>
          </View>
          <Text style={styles.divider}>•</Text>
          <Text style={styles.metaText}>{restaurant.distance || '1.5 km'}</Text>
          <Text style={styles.divider}>•</Text>
          <Text style={styles.metaText}>₹{restaurant.costForTwo || 600} for 2</Text>
        </View>

        {restaurant.tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {restaurant.tags.slice(0, 2).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
        <Ionicons name={restaurant.isSaved ? 'heart' : 'heart-outline'} size={20} color={restaurant.isSaved ? COLORS.primary : COLORS.gray} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  imageWrap: { width: 110, height: 110, position: 'relative' },
  image: { width: '100%', height: '100%' },
  offerBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  offerText: { fontSize: 9, color: COLORS.white, fontFamily: FONTS.bold },
  info: { flex: 1, padding: SPACING.sm, justifyContent: 'center', gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flex: 1, fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.black },
  cuisine: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 2 },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: SIZES.xs, fontFamily: FONTS.bold, color: COLORS.dark },
  reviewCount: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular },
  divider: { fontSize: SIZES.xs, color: COLORS.lightGray },
  metaText: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular },
  tagsRow: { flexDirection: 'row', gap: 4, marginTop: 2 },
  tag: {
    backgroundColor: COLORS.primaryBg,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: { fontSize: 10, color: COLORS.primary, fontFamily: FONTS.medium },
  saveBtn: { padding: SPACING.sm, justifyContent: 'flex-start', paddingTop: SPACING.md },
});
