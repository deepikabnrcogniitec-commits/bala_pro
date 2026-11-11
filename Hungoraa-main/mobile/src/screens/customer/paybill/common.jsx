// Shared building blocks for the 4-step Pay Bill flow:
//   Amount (PayBill) → Offers & bill (PayBillReview) → Pay (PayBillCheckout) → PayBillSuccess
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Animated, Easing, ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import billPaymentApi from '../../../api/billPayment.api';
import restaurantApi from '../../../api/restaurant.api';
import { isPayBillOffer } from '../../../utils/offers';
import { COLOR, FONT, RADII, SPACING, ELEVATION } from '../../../theme';

export const NAVY = COLOR.navy;
export const GOLD = COLOR.gold;
export const GOLD_DEEP = '#A9791D';
export const CREAM = COLOR.goldTint;
export const PAGE_BG = '#F4F7FB';
export const GREEN = COLOR.success;

export const inr = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;

// ── Count-up rupee / number ──────────────────────────────────────────────────
export function CountUp({ value, style, prefix = '₹', duration = 420, delay = 0 }) {
  const av = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = av.addListener(({ value: v }) => setShown(Math.round(v)));
    Animated.timing(av, {
      toValue: value || 0, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
    return () => av.removeListener(id);
  }, [value]);
  return <Text style={style}>{prefix}{shown.toLocaleString('en-IN')}</Text>;
}

// ── Data hooks ───────────────────────────────────────────────────────────────
export function usePayBillOffers(restaurantId) {
  return useQuery({
    queryKey: ['pay-bill-offers', restaurantId],
    queryFn: () => restaurantApi.getOffers(restaurantId).then((r) => (r.data.data.offers || []).filter(isPayBillOffer)),
    enabled: !!restaurantId,
  });
}

// Server quote = single source of truth for discount, fee, GST and total.
export function useBillQuote({ restaurantId, amount, offerId, offerCode, tip = 0 }) {
  return useQuery({
    queryKey: ['bill-quote', restaurantId, amount, offerId || offerCode || 'none', tip],
    queryFn: () => billPaymentApi.quote({
      restaurantId, billAmount: amount, offerId, offerCode, tipAmount: tip,
    }).then((r) => r.data.data),
    enabled: !!restaurantId && amount > 0,
    placeholderData: (prev) => prev,
    staleTime: 15000,
  });
}

// ── Header with restaurant + 3-step progress ─────────────────────────────────
const STEPS = ['Amount', 'Offers', 'Pay'];

export function PayBillHeader({ restaurant, step, onBack, title, subtitle }) {
  const insets = useSafeAreaInsets();
  const avatar = restaurant?.images?.[0]?.url || restaurant?.logo?.url || null;

  return (
    <LinearGradient
      colors={['#1B5E8F', NAVY]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[h.wrap, { paddingTop: insets.top + (Platform.OS === 'ios' ? 6 : 12) }]}
    >
      <View style={h.row}>
        <TouchableOpacity onPress={onBack} style={h.back} hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        {restaurant ? (
          avatar ? <Image source={{ uri: avatar }} style={h.avatar} /> : (
            <View style={[h.avatar, h.avatarFallback]}>
              <Text style={h.avatarLetter}>{restaurant.name?.charAt(0)}</Text>
            </View>
          )
        ) : (
          <View style={[h.avatar, h.avatarFallback]}><Ionicons name="receipt-outline" size={18} color="#fff" /></View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={h.title} numberOfLines={1}>{title || restaurant?.name || 'Pay Bill'}</Text>
          <Text style={h.sub} numberOfLines={1}>
            {subtitle || [restaurant?.address?.city, 'Dine-in bill payment'].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {restaurant?.averageRating > 0 ? (
          <View style={h.rating}>
            <Ionicons name="star" size={11} color={GOLD} />
            <Text style={h.ratingText}>{restaurant.averageRating.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>

      {step ? (
        <View style={h.steps}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <React.Fragment key={label}>
                <View style={h.step}>
                  <View style={[h.dot, done && h.dotDone, active && h.dotActive]}>
                    {done
                      ? <Ionicons name="checkmark" size={11} color={NAVY} />
                      : <Text style={[h.dotNum, active && { color: NAVY }]}>{n}</Text>}
                  </View>
                  <Text style={[h.stepLabel, (done || active) && h.stepLabelOn]}>{label}</Text>
                </View>
                {i < STEPS.length - 1 ? <View style={[h.line, done && h.lineDone]} /> : null}
              </React.Fragment>
            );
          })}
        </View>
      ) : null}
    </LinearGradient>
  );
}

// ── Sticky bottom CTA ────────────────────────────────────────────────────────
export function FooterCTA({ label, sub, onPress, disabled, loading, icon = 'arrow-forward', leading }) {
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (v) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40 }).start();

  return (
    <View style={[ft.wrap, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
      {leading}
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          activeOpacity={0.92}
          disabled={disabled || loading}
          onPress={onPress}
          onPressIn={() => spring(0.97)}
          onPressOut={() => spring(1)}
          style={[ft.btnWrap, (disabled || loading) && { opacity: 0.45 }]}
        >
          <LinearGradient colors={['#E0B15A', GOLD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ft.btn}>
            {loading ? <ActivityIndicator color={NAVY} /> : (
              <>
                <View style={{ flex: 1 }}>
                  <Text style={ft.label}>{label}</Text>
                  {sub ? <Text style={ft.sub}>{sub}</Text> : null}
                </View>
                <View style={ft.arrow}><Ionicons name={icon} size={18} color={GOLD} /></View>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────
export function Section({ title, right, children, style }) {
  return (
    <View style={[sc.card, style]}>
      {title ? (
        <View style={sc.head}>
          <Text style={sc.title}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const h = StyleSheet.create({
  wrap: {
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
    borderBottomLeftRadius: 26, borderBottomRightRadius: 26, ...ELEVATION.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  back: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: FONT.bold, fontSize: 16, color: '#fff' },
  title: { fontFamily: FONT.display, fontSize: 18, color: '#fff' },
  sub: { fontFamily: FONT.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  rating: {
    flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: RADII.pill, paddingHorizontal: 8, paddingVertical: 4,
  },
  ratingText: { fontFamily: FONT.bold, fontSize: 11, color: '#fff' },
  steps: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md, paddingHorizontal: 4 },
  step: { alignItems: 'center', gap: 4, width: 56 },
  dot: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  dotActive: { backgroundColor: GOLD, borderColor: GOLD },
  dotDone: { backgroundColor: '#fff', borderColor: '#fff' },
  dotNum: { fontFamily: FONT.bold, fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  stepLabel: { fontFamily: FONT.medium, fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  stepLabelOn: { color: '#fff', fontFamily: FONT.semiBold },
  line: { flex: 1, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 16 },
  lineDone: { backgroundColor: '#fff' },
});

const ft = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, ...ELEVATION.lg,
  },
  btnWrap: { borderRadius: RADII.pill, overflow: 'hidden' },
  btn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingLeft: 24, paddingRight: 8, minHeight: 56 },
  label: { fontFamily: FONT.bold, fontSize: 16, color: NAVY },
  sub: { fontFamily: FONT.semiBold, fontSize: 11, color: 'rgba(12,47,78,0.7)', marginTop: 1 },
  arrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
});

const sc = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: RADII.lg, padding: SPACING.md, marginTop: SPACING.md, ...ELEVATION.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  title: { fontFamily: FONT.display, fontSize: 17, color: NAVY },
});
