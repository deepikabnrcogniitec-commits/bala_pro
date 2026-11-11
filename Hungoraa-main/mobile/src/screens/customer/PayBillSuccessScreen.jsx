// Pay Bill — done. Check-mark pop → party-popper confetti → Hungora coin drops
// in and flips → coins count up → receipt slides in.
import React, { useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing, Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { COLOR, FONT, RADII, SPACING, ELEVATION } from '../../theme';
import { CountUp, NAVY, GOLD, GOLD_DEEP, CREAM, PAGE_BG, GREEN, inr } from './paybill/common';

const { width: W, height: H } = Dimensions.get('window');
const CONFETTI_COLORS = [GOLD, '#F6D27A', '#1B5E8F', '#4FA3E0', '#E4572E', '#2E7D5B', '#F28DB2', '#FFFFFF'];
const rand = (min, max) => min + Math.random() * (max - min);

// ── Party popper: a burst of confetti shot from one corner, falling under gravity
function PopperBurst({ originX, originY, dir, delay = 0, count = 34 }) {
  const pieces = useMemo(() => Array.from({ length: count }).map(() => {
    const T = rand(1.5, 2.3); // seconds of flight
    const vx = dir * rand(60, W * 0.55); // px/s sideways (toward the centre)
    const vy = -rand(420, 780); // px/s upward
    const g = 820; // px/s²
    const steps = [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1];
    return {
      T,
      xs: steps.map((t) => vx * t * T),
      ys: steps.map((t) => vy * t * T + 0.5 * g * (t * T) ** 2),
      steps,
      spin: `${rand(-900, 900)}deg`,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape: Math.random() < 0.45 ? 'rect' : Math.random() < 0.6 ? 'strip' : 'dot',
      size: rand(6, 10),
      wobble: rand(0.4, 1),
      v: new Animated.Value(0),
    };
  }), []);

  useEffect(() => {
    Animated.parallel(pieces.map((pc) => Animated.timing(pc.v, {
      toValue: 1, duration: pc.T * 1000, delay: delay + rand(0, 90), easing: Easing.linear, useNativeDriver: true,
    }))).start();
  }, []);

  return pieces.map((pc, i) => {
    const dims = pc.shape === 'strip' ? { width: 4, height: pc.size * 1.8, borderRadius: 2 }
      : pc.shape === 'dot' ? { width: pc.size, height: pc.size, borderRadius: pc.size / 2 }
        : { width: pc.size, height: pc.size * 0.6, borderRadius: 1 };
    return (
      <Animated.View
        key={i}
        style={[dims, {
          position: 'absolute', left: originX, top: originY, backgroundColor: pc.color,
          opacity: pc.v.interpolate({ inputRange: [0, 0.05, 0.75, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateX: pc.v.interpolate({ inputRange: pc.steps, outputRange: pc.xs }) },
            { translateY: pc.v.interpolate({ inputRange: pc.steps, outputRange: pc.ys }) },
            { rotate: pc.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', pc.spin] }) },
            { scaleX: pc.v.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, pc.wobble, 1, pc.wobble, 1] }) },
          ],
        }]}
      />
    );
  });
}

// Popper cone that kicks when it fires.
function Popper({ side, delay }) {
  const kick = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(kick, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 14 }),
      Animated.delay(900),
      Animated.timing(kick, { toValue: 2, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.Text
      style={[st.popper, side === 'left' ? { left: 14 } : { right: 14 }, {
        opacity: kick.interpolate({ inputRange: [0, 0.2, 1, 2], outputRange: [0, 1, 1, 0] }),
        transform: [
          { scaleX: side === 'left' ? 1 : -1 },
          { scale: kick.interpolate({ inputRange: [0, 1, 2], outputRange: [0.4, 1, 0.8] }) },
          { rotate: kick.interpolate({ inputRange: [0, 1, 2], outputRange: ['20deg', '-10deg', '0deg'] }) },
        ],
      }]}
    >
      🎉
    </Animated.Text>
  );
}

// ── The Hungora coin ─────────────────────────────────────────────────────────
function HungoraCoin({ size = 92, delay = 0 }) {
  const drop = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(drop, { toValue: 1, useNativeDriver: true, friction: 5, tension: 60 }),
        Animated.timing(flip, { toValue: 2, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.delay(delay + 400),
      Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <View style={{ width: size * 1.9, height: size * 1.9, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2,
          borderWidth: 3, borderColor: '#F6D27A',
          opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
          transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
        }}
      />
      <Animated.View
        style={{
          opacity: drop.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
          transform: [
            { perspective: 800 },
            { translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-180, 0] }) },
            { rotateY: flip.interpolate({ inputRange: [0, 2], outputRange: ['0deg', '720deg'] }) },
          ],
        }}
      >
        <LinearGradient
          colors={['#F9DC8C', '#E0B15A', '#B8841F']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[st.coin, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <View style={[st.coinInner, { width: size * 0.76, height: size * 0.76, borderRadius: size * 0.38 }]}>
            <Text style={[st.coinH, { fontSize: size * 0.42 }]}>H</Text>
          </View>
          <View style={st.shine} />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function PayBillSuccessScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { billPayment, restaurantName, coinsEarned = 0 } = route.params || {};
  const discount = billPayment?.discountBreakup?.total || 0;   // offer + app discount
  const appDiscount = billPayment?.appDiscount || 0;
  const hasCoins = coinsEarned > 0;

  const check = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(check, { toValue: 1, useNativeDriver: true, friction: 5, tension: 70 }),
      Animated.delay(hasCoins ? 900 : 300),
      Animated.spring(rise, { toValue: 1, useNativeDriver: true, friction: 8, tension: 50 }),
    ]).start();
  }, []);

  const popY = H * 0.3;
  const methodName = {
    upi: 'UPI', card: 'Card', wallet: 'Hungora Wallet', razorpay: 'Net Banking',
  }[billPayment?.paymentMethod] || 'Online';

  const rows = [
    { label: 'Bill amount', value: inr(billPayment?.billAmount) },
    ...(discount - appDiscount > 0 ? [{
      label: 'Offer discount', sub: billPayment?.offerCode || undefined,
      value: `− ${inr(discount - appDiscount)}`, tone: GREEN,
    }] : []),
    ...(appDiscount > 0 ? [{
      label: 'Hungora app discount',
      sub: `${billPayment?.appDiscountLabel ? `${billPayment.appDiscountLabel} · ` : ''}for paying on the app`,
      value: `− ${inr(appDiscount)}`, tone: GREEN,
    }] : []),
    ...(discount > 0 ? [{ label: 'Amount after discount', value: inr(Math.max(0, (billPayment?.billAmount || 0) - discount)) }] : []),
    ...(billPayment?.convenienceFee > 0 ? [{ label: 'Convenience fee', value: inr(billPayment.convenienceFee) }] : []),
    ...(billPayment?.gstAmount > 0 ? [{ label: 'GST', value: inr(billPayment.gstAmount) }] : []),
    ...(billPayment?.tipAmount > 0 ? [{ label: 'Tip', value: inr(billPayment.tipAmount) }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#1B5E8F', NAVY]} style={[st.hero, { paddingTop: insets.top + 28 }]}>
          <Animated.View style={[st.check, { transform: [{ scale: check }] }]}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </Animated.View>
          <Animated.View style={{ opacity: check, alignItems: 'center' }}>
            <Text style={st.heroTitle}>Payment successful</Text>
            <Text style={st.heroAmt}>{inr(billPayment?.finalAmount)}</Text>
            <Text style={st.heroSub}>paid to {restaurantName || 'the restaurant'}</Text>
          </Animated.View>

          {hasCoins ? (
            <View style={st.coinBlock}>
              <HungoraCoin delay={500} />
              <View style={st.coinTextWrap}>
                <CountUp value={coinsEarned} prefix="+" delay={900} duration={900} style={st.coinCount} />
                <Text style={st.coinLabel}>Hungora Coins earned</Text>
              </View>
            </View>
          ) : <View style={{ height: SPACING.xl }} />}
        </LinearGradient>

        <Animated.View
          style={{
            opacity: rise,
            transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
            paddingHorizontal: SPACING.lg,
          }}
        >
          {discount > 0 ? (
            <View style={st.saved}>
              <Text style={{ fontSize: 20 }}>🥳</Text>
              <Text style={st.savedText}>
                You saved {inr(discount)} on this bill!
                {appDiscount > 0 ? ` (incl. ${inr(appDiscount)} Hungora app discount)` : ''}
              </Text>
            </View>
          ) : null}

          {hasCoins ? (
            <View style={st.coinNote}>
              <Ionicons name="wallet" size={16} color={GOLD_DEEP} />
              <Text style={st.coinNoteText}>
                {coinsEarned} coins added to your Hungora Wallet. Use them on your next bill.
              </Text>
            </View>
          ) : null}

          <View style={st.receipt}>
            <View style={st.receiptHead}>
              <Text style={st.receiptTitle}>Payment receipt</Text>
              <View style={st.paidTag}><Text style={st.paidText}>PAID</Text></View>
            </View>
            <Text style={st.meta}>
              {dayjs(billPayment?.paidAt || undefined).format('DD MMM YYYY, h:mm A')} · {methodName}
            </Text>
            <View style={st.dashed} />
            {rows.map((r) => (
              <View key={r.label} style={st.row}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={st.rowLabel}>{r.label}</Text>
                  {r.sub ? <Text style={st.rowSub} numberOfLines={2}>{r.sub}</Text> : null}
                </View>
                <Text style={[st.rowValue, r.tone && { color: r.tone }]}>{r.value}</Text>
              </View>
            ))}
            <View style={st.dashed} />
            <View style={st.row}>
              <Text style={st.totalLabel}>Total paid</Text>
              <Text style={st.totalValue}>{inr(billPayment?.finalAmount)}</Text>
            </View>
            <Text style={st.ref}>Ref: {billPayment?._id || '—'}</Text>
            <View style={st.email}>
              <Ionicons name="mail-outline" size={13} color={COLOR.inkFaint} />
              <Text style={st.emailText}>A copy has been sent to your email</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={st.doneWrap}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'HomeMain' }] })}
          >
            <LinearGradient colors={['#E0B15A', GOLD]} style={st.done}>
              <Text style={st.doneText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={st.history} onPress={() => navigation.navigate('BillPaymentHistory')}>
            <Text style={st.historyText}>View payment history</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Celebration layer */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Popper side="left" delay={350} />
        <Popper side="right" delay={450} />
        <PopperBurst originX={34} originY={popY} dir={1} delay={400} />
        <PopperBurst originX={W - 40} originY={popY} dir={-1} delay={500} />
        <PopperBurst originX={34} originY={popY} dir={1} delay={1300} count={18} />
        <PopperBurst originX={W - 40} originY={popY} dir={-1} delay={1400} count={18} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  hero: {
    alignItems: 'center', paddingBottom: SPACING.xl, paddingHorizontal: SPACING.lg,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  check: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.25)', marginBottom: SPACING.md,
  },
  heroTitle: { fontFamily: FONT.semiBold, fontSize: 15, color: COLOR.onNavySoft, letterSpacing: 0.4 },
  heroAmt: { fontFamily: FONT.display, fontSize: 40, color: '#fff', marginTop: 4 },
  heroSub: { fontFamily: FONT.regular, fontSize: 13, color: COLOR.onNavySoft, marginTop: 2 },

  coinBlock: { alignItems: 'center', marginTop: SPACING.sm },
  coin: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#F9DC8C', ...ELEVATION.md },
  coinInner: {
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(137,96,18,0.45)',
    backgroundColor: 'rgba(255,235,170,0.25)',
  },
  coinH: { fontFamily: FONT.displayBold, color: '#7A5410' },
  shine: {
    position: 'absolute', top: 10, left: 16, width: 18, height: 8, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.55)', transform: [{ rotate: '-30deg' }],
  },
  coinTextWrap: { alignItems: 'center', marginTop: -SPACING.md },
  coinCount: { fontFamily: FONT.display, fontSize: 32, color: '#F6D27A' },
  coinLabel: { fontFamily: FONT.semiBold, fontSize: 13, color: '#fff', letterSpacing: 0.3 },

  popper: { position: 'absolute', top: H * 0.3 - 20, fontSize: 44 },

  saved: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: SPACING.lg,
    backgroundColor: COLOR.successTint, borderRadius: RADII.lg, padding: SPACING.md, borderWidth: 1, borderColor: '#B9DCC9',
  },
  savedText: { fontFamily: FONT.bold, fontSize: 15, color: GREEN, flex: 1 },
  coinNote: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: SPACING.sm,
    backgroundColor: CREAM, borderRadius: RADII.lg, padding: SPACING.md, borderWidth: 1, borderColor: '#EAD4A3',
  },
  coinNoteText: { flex: 1, fontFamily: FONT.medium, fontSize: 13, color: GOLD_DEEP, lineHeight: 18 },

  receipt: { backgroundColor: '#fff', borderRadius: RADII.lg, padding: SPACING.lg, marginTop: SPACING.md, ...ELEVATION.sm },
  receiptHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  receiptTitle: { fontFamily: FONT.display, fontSize: 18, color: NAVY },
  paidTag: { backgroundColor: COLOR.successTint, borderRadius: RADII.pill, paddingHorizontal: 10, paddingVertical: 3 },
  paidText: { fontFamily: FONT.bold, fontSize: 11, color: GREEN, letterSpacing: 1 },
  meta: { fontFamily: FONT.regular, fontSize: 12, color: COLOR.inkFaint, marginTop: 4 },
  dashed: { borderBottomWidth: 1, borderStyle: 'dashed', borderColor: COLOR.border, marginVertical: SPACING.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  rowLabel: { fontFamily: FONT.regular, fontSize: 14, color: COLOR.inkSoft },
  rowSub: { fontFamily: FONT.regular, fontSize: 11.5, color: COLOR.inkFaint, marginTop: 1 },
  rowValue: { fontFamily: FONT.semiBold, fontSize: 14, color: COLOR.ink },
  totalLabel: { fontFamily: FONT.bold, fontSize: 16, color: NAVY },
  totalValue: { fontFamily: FONT.display, fontSize: 22, color: NAVY },
  ref: { fontFamily: FONT.regular, fontSize: 11, color: COLOR.inkFaint, marginTop: SPACING.xs },
  email: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  emailText: { fontFamily: FONT.regular, fontSize: 11, color: COLOR.inkFaint },

  doneWrap: { borderRadius: RADII.pill, overflow: 'hidden', marginTop: SPACING.lg },
  done: { paddingVertical: 16, alignItems: 'center' },
  doneText: { fontFamily: FONT.bold, fontSize: 16, color: NAVY },
  history: { alignItems: 'center', padding: SPACING.md },
  historyText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLOR.blueSoft },
});
