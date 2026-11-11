import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { HOME_COLORS, HOME_FONTS, scale, SCREEN_WIDTH, DEPTH } from './homeTheme';

const CARD_W = SCREEN_WIDTH - scale(32);
const SNAP = CARD_W + scale(12);

/**
 * Auto-sliding promo carousel driven by live offers.
 *  - manual swipe + auto advance (pauses briefly after a manual swipe)
 *  - pagination dots
 *  - "Grab Deal" opens the offer; tapping the code copies it
 */
export default function PromoCarousel({ promos = [], onOpen }) {
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
    const t = setInterval(advance, 4000);
    return () => clearInterval(t);
  }, [advance, promos.length]);

  const onScrollEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SNAP);
    setIndex(i);
    pausedUntil.current = Date.now() + 6000;
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
        contentContainerStyle={{ paddingHorizontal: scale(16) }}
        renderItem={({ item }) => (
          <Pressable style={styles.slideWrap} onPress={() => onOpen && onOpen(item)}>
            <LinearGradient
              colors={item.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View style={styles.shapeCircle} />
              <View style={styles.shapeDiamond} />

              <Text style={styles.discount}>{item.discount}</Text>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.sub} numberOfLines={2}>{item.subtitle}</Text>

              <View style={styles.footer}>
                <View style={styles.grab}>
                  <Text style={styles.grabText}>Grab Deal</Text>
                  <Ionicons name="arrow-forward" size={scale(13)} color={HOME_COLORS.magenta} />
                </View>
                {item.promoCode ? (
                  <Pressable style={styles.code} onPress={() => copyCode(item.promoCode)} hitSlop={8}>
                    <Ionicons name="copy-outline" size={scale(12)} color="#fff" />
                    <Text style={styles.codeText}>{item.promoCode}</Text>
                  </Pressable>
                ) : null}
              </View>
            </LinearGradient>
          </Pressable>
        )}
      />

      {promos.length > 1 ? (
        <View style={styles.dots}>
          {promos.map((p, i) => (
            <View key={p.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slideWrap: { width: CARD_W, marginRight: scale(12) },
  card: {
    borderRadius: scale(26),
    padding: scale(20),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    minHeight: scale(160),
    ...DEPTH.mid,
  },
  shapeCircle: {
    position: 'absolute',
    top: scale(-26),
    right: scale(-26),
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  shapeDiamond: {
    position: 'absolute',
    bottom: scale(-34),
    right: scale(20),
    width: scale(74),
    height: scale(74),
    backgroundColor: 'rgba(255,217,26,0.12)',
    transform: [{ rotate: '45deg' }],
  },
  discount: {
    color: HOME_COLORS.gold,
    fontSize: scale(30),
    lineHeight: scale(32),
    fontFamily: HOME_FONTS.extraBold,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  title: {
    color: '#fff',
    fontSize: scale(15),
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
    marginTop: scale(4),
  },
  sub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: scale(12),
    fontFamily: HOME_FONTS.regular,
    marginTop: scale(3),
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginTop: scale(14),
  },
  grab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: '#fff',
  },
  grabText: {
    fontSize: scale(12),
    fontFamily: HOME_FONTS.extraBold,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: HOME_COLORS.magenta,
  },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingHorizontal: scale(10),
    paddingVertical: scale(7),
    borderRadius: scale(10),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  codeText: {
    color: '#fff',
    fontSize: scale(11),
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
    letterSpacing: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(6),
    marginTop: scale(12),
  },
  dot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: scale(18),
    backgroundColor: HOME_COLORS.magenta,
  },
});
