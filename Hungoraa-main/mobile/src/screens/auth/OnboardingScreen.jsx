import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity,
  Animated, StatusBar, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SIZES, SPACING } from '../../constants';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    emoji: '🗺️',
    title: 'Discover Amazing\nRestaurants',
    subtitle: 'Explore thousands of restaurants near you. Find the perfect place for every occasion.',
    bg: ['#1B5E8F', '#0C2F4E'],
  },
  {
    id: '2',
    emoji: '📅',
    title: 'Reserve Tables\nInstantly',
    subtitle: 'Book tables in seconds. Choose your date, time, and guests with zero hassle.',
    bg: ['#246C97', '#123E5C'],
  },
  {
    id: '3',
    emoji: '🎁',
    title: 'Exclusive Deals\n& Offers',
    subtitle: 'Get up to 50% off on dining. Unlock special deals and cashback every time you dine.',
    bg: ['#1B5E8F', '#081E33'],
  },
];

export default function OnboardingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1 });
    } else {
      navigation.replace('Login');
    }
  };

  const renderItem = ({ item }) => (
    <LinearGradient colors={item.bg} style={styles.slide}>
      <View style={styles.slideContent}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    </LinearGradient>
  );

  const renderDot = (_, index) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' });
    const opacity = scrollX.interpolate({ inputRange, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });
    return (
      <Animated.View key={index} style={[styles.dot, { width: dotWidth, opacity }]} />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onMomentumScrollEnd={(e) =>
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      />

      <View style={styles.footer}>
        <View style={styles.dots}>{slides.map(renderDot)}</View>

        <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.85}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.nextGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextText}>
              {currentIndex === slides.length - 1 ? "Let's Go 🚀" : 'Next →'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.replace('Login')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: { width, height, alignItems: 'center', justifyContent: 'center' },
  slideContent: { alignItems: 'center', paddingHorizontal: SPACING.xl },
  emoji: { fontSize: 88, marginBottom: SPACING.xl },
  title: {
    fontSize: 32,
    fontFamily: FONTS.extraBold,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: SIZES.md,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 26,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: SPACING.lg },
  dot: { height: 8, borderRadius: 4, backgroundColor: COLORS.white },
  nextBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: SPACING.md },
  nextGradient: { paddingVertical: 16, alignItems: 'center' },
  nextText: { fontSize: SIZES.lg, fontFamily: FONTS.bold, color: COLORS.white },
  skipBtn: { paddingVertical: 8 },
  skipText: { fontSize: SIZES.base, color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.medium },
});
