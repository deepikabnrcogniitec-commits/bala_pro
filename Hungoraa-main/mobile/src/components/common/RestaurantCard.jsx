import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, BORDER_RADIUS, SHADOW } from '../../constants';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.65;

export default function RestaurantCard({ restaurant, onPress }) {
  const primaryImage = restaurant.images?.[0]?.url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400';
  const offer = restaurant.offers?.[0];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: primaryImage }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.gradient} />

        {offer && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerText}>{offer.title}</Text>
          </View>
        )}

        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={11} color={COLORS.rating} />
          <Text style={styles.rating}>{restaurant.averageRating?.toFixed(1) || '4.0'}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
        <Text style={styles.cuisine} numberOfLines={1}>
          {Array.isArray(restaurant.cuisine) ? restaurant.cuisine.slice(0, 2).join(' • ') : restaurant.cuisine}
        </Text>
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={12} color={COLORS.gray} />
            <Text style={styles.metaText}>{restaurant.distance || restaurant.address?.city || '2 km'}</Text>
          </View>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.metaText}>₹{restaurant.costForTwo || 600} for 2</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.priceRange}>{restaurant.priceRange || '$$'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.md,
  },
  imageContainer: { position: 'relative', height: 160 },
  image: { width: '100%', height: '100%' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
  offerBadge: {
    position: 'absolute',
    top: SIZES.sm,
    left: SIZES.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  offerText: { fontSize: 10, color: COLORS.white, fontFamily: FONTS.bold },
  ratingBadge: {
    position: 'absolute',
    top: SIZES.sm,
    right: SIZES.sm,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rating: { fontSize: 11, color: COLORS.white, fontFamily: FONTS.bold },
  info: { padding: SIZES.sm },
  name: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.black, marginBottom: 2 },
  cuisine: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular, marginBottom: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaText: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular },
  dot: { fontSize: SIZES.xs, color: COLORS.lightGray },
  priceRange: { fontSize: SIZES.xs, color: COLORS.primary, fontFamily: FONTS.bold },
});
