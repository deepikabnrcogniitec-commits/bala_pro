import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  runOnJS,
} from 'react-native-reanimated';
import FoodReelCard from './FoodReelCard';
import { HOME_COLORS, HOME_FONTS, scale, REEL, SCREEN_WIDTH } from './homeTheme';

const SIDE_PAD = (SCREEN_WIDTH - REEL.CARD_W) / 2;

/**
 * Hero "Taste in Motion" rail — a snapping carousel of featured restaurants
 * rendered as tilted 3D cards (looping clip when available, else poster).
 * `data` comes from the featured-restaurants query.
 */
export default function FoodReelsRail({ data = [], onBook, onOpen }) {
  const scrollX = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const reels = data;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
      const i = Math.round(e.contentOffset.x / REEL.SPACING);
      runOnJS(setActiveIndex)(i);
    },
  });

  if (!reels.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.kicker}>TASTE IN MOTION</Text>
          <Text style={styles.heading}>Watch it sizzle, then book</Text>
        </View>
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {String(Math.min(activeIndex + 1, reels.length)).padStart(2, '0')}
            <Text style={styles.counterDim}> / {String(reels.length).padStart(2, '0')}</Text>
          </Text>
        </View>
      </View>

      <Animated.FlatList
        data={reels}
        keyExtractor={(it) => it.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={REEL.SPACING}
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: SIDE_PAD, paddingVertical: scale(10) }}
        renderItem={({ item, index }) => (
          <FoodReelCard
            item={item}
            index={index}
            scrollX={scrollX}
            isActive={index === activeIndex}
            onPress={() => onOpen?.(item)}
            onPressBook={() => onBook?.(item)}
          />
        )}
      />

      <View style={styles.dots}>
        {reels.map((it, i) => (
          <View
            key={it.id}
            style={[styles.dot, i === activeIndex ? styles.dotActive : null]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: scale(6),
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: scale(22),
    marginBottom: scale(4),
  },
  kicker: {
    color: HOME_COLORS.accentYellow,
    fontSize: scale(11),
    letterSpacing: 1.4,
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
  },
  heading: {
    color: '#fff',
    fontSize: scale(20),
    marginTop: scale(3),
    fontFamily: HOME_FONTS.extraBold,
    fontWeight: '800',
  },
  counter: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(10),
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  counterText: {
    color: '#fff',
    fontSize: scale(13),
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
  },
  counterDim: {
    color: 'rgba(255,255,255,0.5)',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(6),
    marginTop: scale(2),
  },
  dot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  dotActive: {
    width: scale(20),
    backgroundColor: HOME_COLORS.accentYellow,
  },
});
