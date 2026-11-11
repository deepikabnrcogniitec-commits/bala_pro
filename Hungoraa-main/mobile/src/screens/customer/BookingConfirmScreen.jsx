import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, StatusBar, ActivityIndicator, TextInput, Linking, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import bookingApi from '../../api/booking.api';
import paymentApi from '../../api/payment.api';
import { COLORS, FONTS, SIZES, SPACING, BORDER_RADIUS, SHADOW } from '../../constants';

const GOLD = '#C8952B';
const NAVY = '#0C2F4E';

const dealLabel = (o) => (o?.type === 'percentage'
  ? `${o.discountValue}% Off`
  : o?.type === 'flat' ? `Flat ₹${o.discountValue} Off`
    : o?.type === 'bogo' ? 'Buy 1 Get 1 Free' : (o?.title || 'Deal'));

const prettyDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch { return iso; }
};

export default function BookingConfirmScreen({ navigation, route }) {
  const {
    restaurantId, restaurantName, restaurant, offers = [],
    date, time, guests, tableId, specialRequest: initialRequest,
    depositAmount: rawDeposit,
  } = route.params;

  const depositAmount = Number(rawDeposit) || 0;
  const hasDeposit = depositAmount > 0;

  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(null); // { discountAmount, offer }
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(hasDeposit ? 'razorpay' : 'cash');
  const [specialRequest, setSpecialRequest] = useState(initialRequest || '');
  const [occasion, setOccasion] = useState(null);

  // Preselect the best booking deal's code, if one was passed through.
  useEffect(() => {
    const withCode = offers.find((o) => o.code);
    if (withCode) setCouponCode(withCode.code);
  }, []);

  const discount = couponApplied?.discountAmount || 0;
  const finalAmount = Math.max(0, depositAmount - discount);

  const address = restaurant?.address
    ? [restaurant.address.street, restaurant.address.city, restaurant.address.state, restaurant.address.pincode].filter(Boolean).join(', ')
    : null;

  const openDirections = () => {
    const [lng, lat] = restaurant?.location?.coordinates || [];
    const q = lat && lng ? `${lat},${lng}` : encodeURIComponent([restaurantName, restaurant?.address?.city].filter(Boolean).join(' '));
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (hasDeposit) {
      // The online deposit must equal the restaurant's amount exactly, so coupons cannot reduce it yet.
      Toast.show({ type: 'info', text1: 'Coupons cannot be applied to the advance yet' });
      return;
    }
    setCouponLoading(true);
    try {
      const { data } = await paymentApi.validateCoupon(couponCode.trim().toUpperCase(), {
        restaurantId, guests, amount: depositAmount || 0,
      });
      const total = data.data?.discountBreakup?.total ?? data.data?.discountAmount ?? 0;
      setCouponApplied({ discountAmount: total, offer: data.data?.offer });
      Toast.show({ type: 'success', text1: total > 0 ? `Coupon applied — ₹${total} off` : 'Coupon applied' });
    } catch (err) {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Invalid coupon' });
    } finally {
      setCouponLoading(false);
    }
  };

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (hasDeposit) {
        // Deposit bookings hold the table first. The Payment screen then collects the deposit,
        // and the booking is only confirmed after the backend verifies the payment.
        const { data } = await bookingApi.holdBooking({
          restaurantId,
          tableId,
          date,
          time,
          guests,
          specialRequest: specialRequest || undefined,
          occasion: occasion || undefined,
          paymentMethod,
          bookingSource: 'mobile',
        });
        return { hold: true, booking: data.data.booking };
      }
      const { data } = await bookingApi.create({
        restaurantId,
        tableId,
        date,
        time,
        guests,
        specialRequest: specialRequest || undefined,
        occasion: occasion || undefined,
        couponCode: couponApplied ? couponCode.trim().toUpperCase() : undefined,
        depositAmount: depositAmount || 0,
        paymentMethod,
      });
      return { hold: false, booking: data.data.booking };
    },
    onSuccess: ({ hold, booking }) => {
      const successParams = {
        bookingId: booking._id,
        bookingCode: booking.bookingId,
        restaurantName,
        restaurant,
        date,
        time,
        guests,
        deal: couponApplied?.offer || offers[0] || null,
        savedAmount: discount,
        cancellationPolicy: restaurant?.cancellationPolicy,
      };
      if (hold) {
        navigation.replace('Payment', {
          bookingId: booking._id,
          amount: depositAmount,
          restaurantName,
          depositRequired: true,
          successParams,
        });
        return;
      }
      navigation.replace('BookingSuccess', successParams);
    },
    onError: (err) => Toast.show({
      type: 'error',
      text1: 'Booking failed',
      text2: err.response?.data?.message || 'Please try again',
    }),
  });

  const PAYMENT_METHODS = [
    { id: 'razorpay', label: 'UPI / Card / Net Banking', icon: 'card-outline', desc: 'Powered by Razorpay' },
    { id: 'wallet', label: 'Hungora Wallet', icon: 'wallet-outline', desc: 'Use your wallet balance' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#1B5E8F', NAVY]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Booking</Text>
      </LinearGradient>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Restaurant */}
        <View style={styles.card}>
          <View style={styles.restRow}>
            {restaurant?.image ? (
              <Image source={{ uri: restaurant.image }} style={styles.restImg} />
            ) : (
              <View style={[styles.restImg, styles.restImgFallback]}>
                <Text style={styles.restImgLetter}>{restaurantName?.charAt(0)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.restaurantName} numberOfLines={1}>{restaurantName}</Text>
              <View style={styles.restMeta}>
                {restaurant?.averageRating > 0 ? (
                  <View style={styles.ratingChip}>
                    <Ionicons name="star" size={10} color="#fff" />
                    <Text style={styles.ratingChipText}>{restaurant.averageRating.toFixed(1)}</Text>
                  </View>
                ) : null}
                {restaurant?.cuisine?.length ? (
                  <Text style={styles.restCuisine} numberOfLines={1}>{restaurant.cuisine.slice(0, 2).join(', ')}</Text>
                ) : null}
              </View>
              {address ? <Text style={styles.address} numberOfLines={1}>{address}</Text> : null}
            </View>
          </View>
        </View>

        {/* Booking details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reservation</Text>
          <View style={styles.detailStrip}>
            <Detail icon="calendar-outline" label="Date" value={prettyDate(date)} />
            <View style={styles.detailSep} />
            <Detail icon="time-outline" label="Time" value={time} />
            <View style={styles.detailSep} />
            <Detail icon="people-outline" label="Guests" value={`${guests}`} />
          </View>
          <View style={styles.holdNote}>
            <Ionicons name="information-circle-outline" size={13} color={COLORS.gray} />
            <Text style={styles.holdNoteText}>Sent to the restaurant to confirm — usually within a few minutes.</Text>
          </View>
          {address ? (
            <TouchableOpacity style={styles.dirLink} onPress={openDirections}>
              <Ionicons name="navigate-outline" size={14} color={NAVY} />
              <Text style={styles.dirLinkText}>Get directions</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Occasion + special request */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Any special request?</Text>
          <View style={styles.occasionRow}>
            {['Birthday', 'Anniversary', 'Date', 'Business'].map((o) => (
              <TouchableOpacity
                key={o}
                style={[styles.occChip, occasion === o && styles.occChipOn]}
                onPress={() => setOccasion(occasion === o ? null : o)}
              >
                <Text style={[styles.occChipText, occasion === o && styles.occChipTextOn]}>{o}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.requestInput}
            value={specialRequest}
            onChangeText={setSpecialRequest}
            placeholder="High chair, window seat, allergies, cake…"
            placeholderTextColor={COLORS.lightGray}
            multiline
          />
        </View>

        {/* Deal */}
        {offers.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Deal for this booking</Text>
            {offers.slice(0, 3).map((o) => (
              <View key={o._id} style={styles.dealRow}>
                <Ionicons name="pricetag" size={14} color={GOLD} />
                <Text style={styles.dealText}>{dealLabel(o)} · <Text style={styles.dealSub}>{o.title}</Text></Text>
                {o.code ? <Text style={styles.dealCode}>{o.code}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Coupon */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Apply Coupon</Text>
          <View style={styles.couponRow}>
            <View style={styles.couponInput}>
              <Ionicons name="pricetag-outline" size={16} color={COLORS.gray} />
              <TextInput
                style={styles.couponText}
                value={couponCode}
                onChangeText={setCouponCode}
                placeholder="Enter coupon code"
                placeholderTextColor={COLORS.lightGray}
                autoCapitalize="characters"
                editable={!couponApplied}
              />
              {couponApplied ? (
                <TouchableOpacity onPress={() => { setCouponApplied(null); setCouponCode(''); }}>
                  <Ionicons name="close-circle" size={18} color={COLORS.error} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.applyBtn, couponApplied && styles.applyBtnApplied]}
              onPress={applyCoupon}
              disabled={couponLoading || !!couponApplied}
            >
              {couponLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.applyBtnText}>{couponApplied ? 'Applied' : 'Apply'}</Text>}
            </TouchableOpacity>
          </View>
          {couponApplied && discount > 0 ? (
            <Text style={styles.couponSuccess}>You save ₹{discount} on your advance.</Text>
          ) : null}
        </View>

        {/* Payment method (only when a deposit is required) */}
        {hasDeposit ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Method</Text>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.method, paymentMethod === m.id && styles.methodActive]}
                onPress={() => setPaymentMethod(m.id)}
              >
                <View style={[styles.methodIcon, paymentMethod === m.id && styles.methodIconActive]}>
                  <Ionicons name={m.icon} size={18} color={paymentMethod === m.id ? '#fff' : COLORS.gray} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.methodLabel, paymentMethod === m.id && styles.methodLabelActive]}>{m.label}</Text>
                  <Text style={styles.methodDesc}>{m.desc}</Text>
                </View>
                <View style={[styles.radio, paymentMethod === m.id && styles.radioActive]}>
                  {paymentMethod === m.id ? <View style={styles.radioDot} /> : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Bill summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Summary</Text>
          {hasDeposit ? (
            <>
              <BillRow label="Advance to reserve" value={`₹${depositAmount}`} />
              {discount > 0 ? <BillRow label={`Coupon (${couponCode})`} value={`− ₹${discount}`} isDiscount /> : null}
              <View style={styles.billDivider} />
              <BillRow label="Payable now" value={`₹${finalAmount}`} isBold />
              <Text style={styles.billNote}>Balance is settled at the restaurant. Advance is adjusted in your final bill.</Text>
            </>
          ) : (
            <>
              <BillRow label="Advance payment" value="Not required" />
              <Text style={styles.billNote}>Pay your full bill at the restaurant. Your table is held on confirmation.</Text>
            </>
          )}
        </View>

        {/* Cancellation policy */}
        <View style={[styles.card, styles.policyCard]}>
          <Ionicons name="shield-checkmark-outline" size={16} color={NAVY} />
          <Text style={styles.policyText}>
            {restaurant?.cancellationPolicy || 'Free cancellation up to 2 hours before your reservation time.'}
          </Text>
        </View>

        <View style={{ height: 130 }} />
      </ScrollView>

      {/* CTA */}
      <View style={styles.cta}>
        <View>
          <Text style={styles.ctaAmount}>{hasDeposit ? `₹${finalAmount}` : 'Free'}</Text>
          <Text style={styles.ctaLabel}>{hasDeposit ? 'Payable now' : 'No advance'}</Text>
        </View>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => bookingMutation.mutate()}
          activeOpacity={0.9}
          disabled={bookingMutation.isPending}
        >
          {bookingMutation.isPending
            ? <ActivityIndicator color={NAVY} />
            : <Text style={styles.confirmBtnText}>{hasDeposit && finalAmount > 0 ? 'Pay & Confirm' : 'Confirm Booking'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Detail({ icon, label, value }) {
  return (
    <View style={sp.detail}>
      <Ionicons name={icon} size={15} color={NAVY} />
      <Text style={sp.detailLabel}>{label}</Text>
      <Text style={sp.detailValue}>{value}</Text>
    </View>
  );
}
const sp = StyleSheet.create({
  detail: { flex: 1, alignItems: 'center', gap: 3 },
  detailLabel: { fontSize: 10, fontFamily: FONTS.medium, color: COLORS.lightGray, textTransform: 'uppercase', letterSpacing: 0.4 },
  detailValue: { fontSize: SIZES.sm, fontFamily: FONTS.bold, color: COLORS.dark },
});

function BillRow({ label, value, isDiscount, isBold }) {
  return (
    <View style={br.row}>
      <Text style={[br.label, isBold && br.bold]}>{label}</Text>
      <Text style={[br.value, isDiscount && br.discount, isBold && br.bold]}>{value}</Text>
    </View>
  );
}
const br = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { fontSize: SIZES.sm, color: COLORS.gray, fontFamily: FONTS.regular },
  value: { fontSize: SIZES.sm, color: COLORS.dark, fontFamily: FONTS.medium },
  discount: { color: GOLD },
  bold: { fontFamily: FONTS.bold, color: COLORS.dark, fontSize: SIZES.base },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: SIZES.lg, fontFamily: FONTS.bold, color: '#fff' },
  body: { flex: 1 },
  card: {
    backgroundColor: COLORS.card, margin: SPACING.lg, marginBottom: 0,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, ...SHADOW.sm,
  },
  cardTitle: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.dark, marginBottom: SPACING.sm },
  restaurantName: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: NAVY },
  address: { fontSize: SIZES.xs, fontFamily: FONTS.regular, color: COLORS.gray, marginTop: 4, lineHeight: 17 },

  restRow: { flexDirection: 'row', gap: SPACING.md },
  restImg: { width: 64, height: 64, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.background },
  restImgFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: NAVY },
  restImgLetter: { fontSize: SIZES.xl, fontFamily: FONTS.bold, color: '#fff' },
  restMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  ratingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.success,
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5,
  },
  ratingChipText: { fontSize: 10, fontFamily: FONTS.bold, color: '#fff' },
  restCuisine: { flex: 1, fontSize: SIZES.xs, fontFamily: FONTS.regular, color: COLORS.gray },

  detailStrip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md,
  },
  detailSep: { width: 1, alignSelf: 'stretch', backgroundColor: COLORS.border, marginVertical: 4 },
  holdNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: SPACING.md },
  holdNoteText: { flex: 1, fontSize: SIZES.xs, fontFamily: FONTS.regular, color: COLORS.gray, lineHeight: 16 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
  occasionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  occChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background,
  },
  occChipOn: { borderColor: GOLD, backgroundColor: '#F7EDD8' },
  occChipText: { fontSize: SIZES.xs, fontFamily: FONTS.semiBold, color: COLORS.gray },
  occChipTextOn: { color: NAVY },
  requestInput: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, fontSize: SIZES.sm, fontFamily: FONTS.regular, color: COLORS.dark,
    backgroundColor: COLORS.background, minHeight: 64, textAlignVertical: 'top',
  },
  dirLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: SPACING.md },
  dirLinkText: { fontSize: SIZES.sm, fontFamily: FONTS.bold, color: NAVY },

  dealRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  dealText: { flex: 1, fontSize: SIZES.sm, fontFamily: FONTS.semiBold, color: COLORS.dark },
  dealSub: { fontFamily: FONTS.regular, color: COLORS.gray },
  dealCode: {
    fontSize: 11, fontFamily: FONTS.bold, color: '#A9791D', letterSpacing: 0.5,
    borderWidth: 1, borderColor: GOLD, borderStyle: 'dashed', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },

  couponRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  couponInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md, height: 48, backgroundColor: COLORS.background,
  },
  couponText: { flex: 1, fontSize: SIZES.base, color: COLORS.dark, fontFamily: FONTS.medium },
  applyBtn: {
    backgroundColor: NAVY, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.lg,
    height: 48, alignItems: 'center', justifyContent: 'center',
  },
  applyBtnApplied: { backgroundColor: COLORS.success },
  applyBtnText: { fontSize: SIZES.sm, fontFamily: FONTS.bold, color: '#fff' },
  couponSuccess: { fontSize: SIZES.sm, color: GOLD, fontFamily: FONTS.medium, marginTop: 8 },

  method: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  methodActive: { borderBottomColor: 'transparent' },
  methodIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  methodIconActive: { backgroundColor: NAVY },
  methodLabel: { fontSize: SIZES.sm, fontFamily: FONTS.semiBold, color: COLORS.dark },
  methodLabelActive: { color: NAVY },
  methodDesc: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: GOLD },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD },

  billDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  billNote: { fontSize: SIZES.xs, color: COLORS.lightGray, fontFamily: FONTS.regular, marginTop: SPACING.sm, lineHeight: 16 },

  policyCard: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  policyText: { flex: 1, fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular, lineHeight: 17 },

  cta: {
    backgroundColor: COLORS.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.lg, paddingBottom: Platform.OS === 'ios' ? 30 : SPACING.lg,
    borderTopWidth: 1, borderTopColor: COLORS.border, ...SHADOW.lg,
  },
  ctaAmount: { fontSize: SIZES.xl, fontFamily: FONTS.bold, color: COLORS.dark },
  ctaLabel: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular },
  confirmBtn: {
    backgroundColor: GOLD, borderRadius: BORDER_RADIUS.full, minWidth: 160,
    paddingHorizontal: SPACING.xl, paddingVertical: 15, alignItems: 'center',
  },
  confirmBtnText: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: NAVY },
});
