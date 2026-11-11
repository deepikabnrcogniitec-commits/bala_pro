import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Platform, StatusBar,
  ScrollView, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SPACING, BORDER_RADIUS, SHADOW } from '../../constants';

const GOLD = '#C8952B';
const NAVY = '#0C2F4E';

const prettyDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }); }
  catch { return iso; }
};
const dealLabel = (o) => (o?.type === 'percentage'
  ? `${o.discountValue}% Off` : o?.type === 'flat' ? `Flat ₹${o.discountValue} Off`
    : o?.type === 'bogo' ? 'Buy 1 Get 1 Free' : (o?.title || 'Deal applied'));

export default function BookingSuccessScreen({ navigation, route }) {
  const {
    bookingCode, restaurantName, restaurant, date, time, guests,
    deal, savedAmount, cancellationPolicy,
  } = route.params;

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  const address = restaurant?.address
    ? [restaurant.address.street, restaurant.address.city, restaurant.address.state].filter(Boolean).join(', ')
    : null;

  const openDirections = () => {
    const [lng, lat] = restaurant?.location?.coordinates || [];
    const q = lat && lng ? `${lat},${lng}` : encodeURIComponent([restaurantName, restaurant?.address?.city].filter(Boolean).join(' '));
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };
  const goHome = () => navigation.reset({ index: 0, routes: [{ name: 'Customer' }] });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1B5E8F', NAVY]} style={styles.bg}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient colors={[COLORS.success, '#40916c']} style={styles.successCircleGrad}>
              <Ionicons name="checkmark" size={48} color="#fff" />
            </LinearGradient>
          </Animated.View>

          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            <Text style={styles.title}>Booking Confirmed</Text>
            <Text style={styles.subtitle}>Your table is reserved. See you there!</Text>

            {/* Boarding-pass style card */}
            <View style={styles.pass}>
              <View style={styles.passTop}>
                <View>
                  <Text style={styles.passLabel}>Booking ID</Text>
                  <Text style={styles.passCode}>#{bookingCode || '—'}</Text>
                </View>
                <View style={styles.passStar}>
                  <Ionicons name="restaurant" size={18} color={NAVY} />
                </View>
              </View>

              <Text style={styles.passRestaurant}>{restaurantName}</Text>
              {address ? <Text style={styles.passAddress} numberOfLines={2}>{address}</Text> : null}

              <View style={styles.notch} />
              <View style={styles.dashed} />

              <View style={styles.passGrid}>
                <PassCell label="Date" value={prettyDate(date)} />
                <PassCell label="Time" value={time} />
                <PassCell label="Guests" value={`${guests}`} />
              </View>

              {deal ? (
                <View style={styles.dealChip}>
                  <Ionicons name="pricetag" size={13} color={GOLD} />
                  <Text style={styles.dealChipText}>
                    {dealLabel(deal)}{savedAmount > 0 ? ` · saved ₹${savedAmount}` : ''}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* What's next */}
            <View style={styles.nextCard}>
              <Text style={styles.nextTitle}>What’s next</Text>
              <NextStep icon="mail-outline" text="Confirmation sent to your email and phone." />
              <NextStep icon="qr-code-outline" text="Show your Booking ID at the restaurant desk." />
              <NextStep icon="wallet-outline" text="Pay your bill via Hungora to earn reward coins." />
            </View>

            <View style={styles.policyBox}>
              <Ionicons name="shield-checkmark-outline" size={14} color="rgba(255,255,255,0.75)" />
              <Text style={styles.policyText}>
                {cancellationPolicy || 'Free cancellation up to 2 hours before your reservation.'}
              </Text>
            </View>

            <View style={styles.actions}>
              {address ? (
                <TouchableOpacity style={styles.dirBtn} onPress={openDirections}>
                  <Ionicons name="navigate-outline" size={16} color="#fff" />
                  <Text style={styles.dirBtnText}>Get Directions</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.primaryBtn} onPress={goHome}>
                <Text style={styles.primaryBtnText}>View My Bookings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={goHome}>
                <Text style={styles.ghostBtnText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

function PassCell({ label, value }) {
  return (
    <View style={styles.passCell}>
      <Text style={styles.passCellLabel}>{label}</Text>
      <Text style={styles.passCellValue}>{value}</Text>
    </View>
  );
}

function NextStep({ icon, text }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepIcon}><Ionicons name={icon} size={15} color={NAVY} /></View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { flex: 1 },
  scroll: { alignItems: 'center', paddingHorizontal: SPACING.xl, paddingTop: Platform.OS === 'ios' ? 90 : 64, paddingBottom: 40 },
  successCircle: { width: 92, height: 92, borderRadius: 46, marginBottom: SPACING.lg, ...SHADOW.lg },
  successCircleGrad: { flex: 1, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', width: '100%' },
  title: { fontSize: SIZES.h2, fontFamily: FONTS.bold, color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: SIZES.base, color: 'rgba(255,255,255,0.72)', textAlign: 'center', fontFamily: FONTS.regular, marginTop: 6, marginBottom: SPACING.xl },

  pass: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.xl, width: '100%', padding: SPACING.lg, ...SHADOW.lg },
  passTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  passLabel: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular },
  passCode: { fontSize: SIZES.lg, fontFamily: FONTS.bold, color: NAVY, marginTop: 2 },
  passStar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F7EDD8', alignItems: 'center', justifyContent: 'center' },
  passRestaurant: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.dark, marginTop: SPACING.md },
  passAddress: { fontSize: SIZES.xs, fontFamily: FONTS.regular, color: COLORS.gray, marginTop: 3, lineHeight: 16 },
  notch: { height: SPACING.md },
  dashed: { borderBottomWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, marginBottom: SPACING.md },
  passGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  passCell: { flex: 1 },
  passCellLabel: { fontSize: 10, fontFamily: FONTS.medium, color: COLORS.lightGray, textTransform: 'uppercase', letterSpacing: 0.5 },
  passCellValue: { fontSize: SIZES.sm, fontFamily: FONTS.bold, color: COLORS.dark, marginTop: 3 },
  dealChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: '#F7EDD8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginTop: SPACING.md,
  },
  dealChipText: { fontSize: SIZES.xs, fontFamily: FONTS.bold, color: NAVY },

  nextCard: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, width: '100%', padding: SPACING.lg, marginTop: SPACING.md, ...SHADOW.sm },
  nextTitle: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.dark, marginBottom: SPACING.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 6 },
  stepIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EEF3F8', alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, fontSize: SIZES.xs, fontFamily: FONTS.regular, color: COLORS.gray, lineHeight: 17 },

  policyBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: SPACING.md, paddingHorizontal: 4 },
  policyText: { flex: 1, fontSize: SIZES.xs, color: 'rgba(255,255,255,0.72)', fontFamily: FONTS.regular, lineHeight: 16 },

  actions: { width: '100%', gap: SPACING.sm, marginTop: SPACING.lg },
  dirBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: BORDER_RADIUS.full, paddingVertical: 13,
  },
  dirBtnText: { fontSize: SIZES.sm, fontFamily: FONTS.bold, color: '#fff' },
  primaryBtn: { backgroundColor: GOLD, borderRadius: BORDER_RADIUS.full, paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: NAVY },
  ghostBtn: { paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { fontSize: SIZES.sm, fontFamily: FONTS.medium, color: 'rgba(255,255,255,0.8)' },
});
