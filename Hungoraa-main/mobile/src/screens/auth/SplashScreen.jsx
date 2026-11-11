import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SIZES } from '../../constants';

const LOGO = require('../../../assets/hungora_darkgreen_gold_logo.png');

export default function SplashScreen({ navigation }) {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 48, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.delay(180),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.14, duration: 650, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
        ]),
      ).start();
    });

    const timer = setTimeout(() => navigation.replace('Onboarding'), 3400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#1B5E8F', '#0C2F4E', '#081E33']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" />

      <Animated.View style={[styles.heroWrap, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
        <Image source={LOGO} style={styles.logoImage} resizeMode="contain" />
      </Animated.View>

      <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>
        <Text style={styles.tagline}>Your Table, Your Way</Text>
      </Animated.View>

      <Animated.View style={[styles.dotsContainer, { opacity: opacityAnim }]}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  heroWrap: {
    width: 230,
    height: 230,
    borderRadius: 32,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  tagline: {
    fontSize: SIZES.md,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 0.3,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: COLORS.white,
    width: 24,
  },
});
