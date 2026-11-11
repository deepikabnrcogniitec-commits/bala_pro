import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { HOME_COLORS, HOME_FONTS, scale, DEPTH } from './homeTheme';

/**
 * Floating 3D restaurant card for the horizontal list.
 *  - Layered brand-tinted shadow so it hovers above the surface
 *  - Tilts slightly and presses down on touch (spring)
 *  - Glass discount chip + rating pill
 */
export default function RestaurantCard({ item, onPress, isFavorite, onToggleFavorite }) {
  const [likedLocal, setLikedLocal] = useState(false);
  const liked = isFavorite ?? likedLocal;
  const press = useSharedValue(0);

  const toggleLike = () => {
    if (onToggleFavorite) onToggleFavorite(item);
    else setLikedLocal((v) => !v);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { scale: withSpring(press.value ? 0.955 : 1, { damping: 15, stiffness: 220 }) },
      { rotateX: `${withSpring(press.value ? 6 : 0)}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.outer, animatedStyle]}>
      <Pressable
        onPressIn={() => { press.value = 1; }}
        onPressOut={() => { press.value = 0; }}
        onPress={onPress}
        style={styles.card}
      >
        <View style={styles.imageWrap}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.image} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.image, styles.imageFallback]}>
              <Ionicons name="restaurant" size={scale(34)} color="#6B8093" />
            </View>
          )}

          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.85)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />

          {item.discount ? (
            <View style={styles.discountChip}>
              <Text style={styles.discountBig}>{item.discount}</Text>
              {item.discountSub ? <Text style={styles.discountSmall}>{item.discountSub}</Text> : null}
            </View>
          ) : null}

          {item.isOpen === false ? (
            <View style={styles.closedChip}><Text style={styles.closedText}>CLOSED</Text></View>
          ) : null}

          <Pressable style={styles.heart} hitSlop={8} onPress={toggleLike}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={scale(18)}
              color={liked ? '#FF4D67' : '#fff'}
            />
          </Pressable>

          <View style={styles.bottomInfo}>
            <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
            <View style={styles.ratingRow}>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={scale(9)} color="#fff" />
                <Text style={styles.ratingText}>{item.rating}</Text>
              </View>
              <Text style={styles.metaText} numberOfLines={1}>
                {item.time}  ·  {item.category}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: scale(210),
    marginRight: scale(16),
    borderRadius: scale(26),
    backgroundColor: '#123C5C',
    ...DEPTH.mid,
  },
  card: {
    borderRadius: scale(26),
    overflow: 'hidden',
  },
  imageWrap: {
    width: '100%',
    height: scale(250),
    backgroundColor: '#123C5C',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A2A44',
  },
  closedChip: {
    position: 'absolute',
    top: scale(12),
    alignSelf: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(8),
    backgroundColor: 'rgba(20,0,12,0.7)',
  },
  closedText: {
    color: '#fff',
    fontSize: scale(10),
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
    letterSpacing: 1,
  },
  discountChip: {
    position: 'absolute',
    top: scale(12),
    left: scale(12),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(12),
    backgroundColor: 'rgba(20,0,12,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  discountBig: {
    color: '#fff',
    fontSize: scale(15),
    fontFamily: HOME_FONTS.extraBold,
    fontWeight: '800',
  },
  discountSmall: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: scale(10),
    fontFamily: HOME_FONTS.semiBold,
    fontWeight: '600',
  },
  heart: {
    position: 'absolute',
    top: scale(12),
    right: scale(12),
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomInfo: {
    position: 'absolute',
    left: scale(14),
    right: scale(14),
    bottom: scale(14),
  },
  title: {
    color: '#fff',
    fontSize: scale(17),
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(7),
    marginTop: scale(6),
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(7),
    backgroundColor: HOME_COLORS.green,
  },
  ratingText: {
    color: '#fff',
    fontSize: scale(11),
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
  },
  metaText: {
    flex: 1,
    color: 'rgba(255,255,255,0.88)',
    fontSize: scale(11.5),
    fontFamily: HOME_FONTS.medium,
  },
});
