import React, {
  useRef, useState, useEffect, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { COLOR, SPACING, RADII, ELEVATION, GRADIENT, FONT } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = SPACING.lg;
const CARD_W = SCREEN_W - H_PAD * 2;
const SNAP = CARD_W + SPACING.md;
const AUTO_MS = 4500;

/**
 * EasyDiner-style offers banner — a full-width, auto-advancing carousel driven
 * by live offers. Manual swipe pauses the auto-scroll briefly; pagination dots
 * track position; tapping the promo code copies it.
 */
export default function OffersBanner({ promos = [], onOpen }) {
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const pausedUntil = useRef(0);

  const advance = useCallback(() => {
    if (promos.length < 2 || Date.now() < pausedUntil.current) return;
    const next = (index + 1) % promos.length;
    listRef.current?.scrollToOffset({ offset: next * SNAP, animated: true });
    setIndex(next);
  }, [index, promos.length]);

  useEffect(() => {
    if (promos.length < 2) return undefined;
    const t = setInterval(advance, AUTO_MS);
    return () => clearInterval(t);
  }, [advance, promos.length]);

  const onScrollEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SNAP);
    setIndex(Math.max(0, Math.min(i, promos.length - 1)));
    pausedUntil.current = Date.now() + 7000;
  };

  const copyCode = async (code) => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    Toast.show({ type: 'success', text1: 'Promo code copied', text2: code });
  };

  if (!promos.length) return null;

  return (
    <View>
      <FlatList
        ref={listRef}
        data={promos}
        keyExtractor={(p) => p.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP}
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={{ paddingHorizontal: H_PAD }}
        renderItem={({ item }) => (
          <Pressable style={styles.slide} onPress={() => onOpen?.(item)}>
            <View style={[styles.card, styles.cardBase]}>
              {item.bannerImage ? (
                <>
                  {/* Uploaded banner — full clarity, edge to edge */}
                  <Image
                    source={{ uri: item.bannerImage }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={220}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(6,14,24,0.12)', 'rgba(4,10,18,0.92)']}
                    locations={[0, 0.42, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                </>
              ) : (
                <>
                  <LinearGradient
                    colors={item.gradient || GRADIENT.blue}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.photo} contentFit="cover" transition={200} />
                  ) : null}
                  <View style={styles.shade} />
                  <View style={styles.blob} />
                </>
              )}

              <View style={styles.content}>
                <View style={styles.kickerRow}>
                  {item.featured ? (
                    <View style={styles.featTag}>
                      <Ionicons name="star" size={9} color={COLOR.blue} />
                      <Text style={styles.featText}>FEATURED</Text>
                    </View>
                  ) : null}
                  <Text style={styles.kicker} numberOfLines={1}>
                    {item.restaurantName || 'Selected restaurants'}
                  </Text>
                </View>
                <Text style={styles.discount} numberOfLines={1}>{item.discount}</Text>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>

                <View style={styles.footer}>
                  <View style={styles.cta}>
                    <Text style={styles.ctaText}>Grab deal</Text>
                    <Ionicons name="arrow-forward" size={13} color={COLOR.blue} />
                  </View>
                  {item.promoCode ? (
                    <Pressable style={styles.code} onPress={() => copyCode(item.promoCode)} hitSlop={8}>
                      <Ionicons name="copy-outline" size={12} color="#FFFFFF" />
                      <Text style={styles.codeText}>{item.promoCode}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          </Pressable>
        )}
      />

      {promos.length > 1 ? (
        <View style={styles.dots}>
          {promos.map((p, i) => (
            <View key={p.id} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { width: CARD_W, marginRight: SPACING.md },
  card: {
    height: 156,
    borderRadius: RADII.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    ...ELEVATION.md,
  },
  cardBase: { backgroundColor: '#0C2F4E' },
  photo: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,20,33,0.32)' },
  blob: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  content: { padding: SPACING.md },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: {
    flexShrink: 1,
    fontFamily: FONT.semiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
  featTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADII.xs,
  },
  featText: {
    fontFamily: FONT.bold,
    fontSize: 8.5,
    letterSpacing: 0.8,
    color: COLOR.blue,
  },
  discount: {
    fontFamily: FONT.display,
    fontSize: 27,
    lineHeight: 31,
    color: '#FFFFFF',
    marginTop: 2,
  },
  title: {
    fontFamily: FONT.regular,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADII.pill,
  },
  ctaText: {
    fontFamily: FONT.bold,
    fontSize: 12,
    letterSpacing: 0.3,
    color: COLOR.blue,
  },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADII.xs,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.6)',
  },
  codeText: {
    fontFamily: FONT.bold,
    fontSize: 11,
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: SPACING.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLOR.border,
  },
  dotOn: {
    width: 18,
    backgroundColor: COLOR.blue,
  },
});
