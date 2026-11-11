import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentApi } from '../../api/payment.api';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants';

const PAYMENT_METHODS = [
  { id: 'razorpay', label: 'Razorpay', icon: '💳', desc: 'Credit/Debit card, UPI, Net Banking' },
  { id: 'wallet', label: 'Hungora Wallet', icon: '👛', desc: 'Instant payment from wallet balance' },
];

// Razorpay's native checkout exists only in a dev/production build (not Expo Go).
// Loaded lazily so wallet and cash payments still work if the module is missing.
const loadRazorpayCheckout = () => {
  try {
    return require('react-native-razorpay').default;
  } catch {
    return null;
  }
};

const RAZORPAY_CANCELLED = 'RAZORPAY_CANCELLED';

const runRazorpayPayment = async ({ bookingId, amount, restaurantName }) => {
  const RazorpayCheckout = loadRazorpayCheckout();
  if (!RazorpayCheckout) {
    throw new Error('Razorpay needs the Hungora app build, not Expo Go.');
  }

  // 1. Backend creates the Razorpay order. Amount is in paise; key is the public Key ID.
  const orderRes = await paymentApi.createOrder({ bookingId, amount, type: 'deposit' });
  const { orderId, amount: amountPaise, currency, key } = orderRes.data.data;

  // 2. Native Razorpay Checkout.
  let result;
  try {
    result = await RazorpayCheckout.open({
      key,
      amount: String(amountPaise),
      currency: currency || 'INR',
      order_id: orderId,
      name: 'Hungora',
      description: `Booking deposit${restaurantName ? ` - ${restaurantName}` : ''}`,
      theme: { color: COLORS.primary },
    });
  } catch (err) {
    // Razorpay reports the user closing checkout as code 0. Confirm on device.
    if (err?.code === 0) {
      const cancelled = new Error('Payment cancelled');
      cancelled.code = RAZORPAY_CANCELLED;
      throw cancelled;
    }
    throw new Error(err?.description || 'Payment failed. Please try again.');
  }

  // 3. Backend verifies the signature and confirms the booking.
  //    The app never marks a booking as paid on its own.
  await paymentApi.verifyPayment({
    razorpayOrderId: result.razorpay_order_id,
    razorpayPaymentId: result.razorpay_payment_id,
    razorpaySignature: result.razorpay_signature,
    bookingId,
  });

  return { success: true };
};

export default function PaymentScreen({ navigation, route }) {
  const { bookingId, amount, walletBalance: walletFromParams = 0, restaurantName, successParams } = route.params || {};
  const qc = useQueryClient();
  const [method, setMethod] = useState('razorpay');

  // Live wallet balance, so the wallet option reflects the current balance.
  const walletQuery = useQuery({
    queryKey: ['payment-wallet'],
    queryFn: async () => (await paymentApi.getWallet()).data.data.wallet,
  });
  const walletBalance = walletQuery.data?.balance ?? walletFromParams;

  const payMutation = useMutation({
    mutationFn: async () => {
      if (method === 'wallet') {
        if (walletBalance < amount) {
          throw new Error(`Insufficient wallet balance. Available: ₹${walletBalance}`);
        }
        return paymentApi.payWithWallet(bookingId, amount);
      }
      // Razorpay: create order -> native checkout -> backend verification
      return runRazorpayPayment({ bookingId, amount, restaurantName });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      // BookingSuccess is reached only after the payment succeeded (wallet debit or backend-verified Razorpay).
      navigation.replace('BookingSuccess', { bookingId, ...(successParams || {}) });
    },
    onError: (err) => {
      if (err?.code === RAZORPAY_CANCELLED) {
        Alert.alert('Payment cancelled', 'Your payment was cancelled. You can try again.');
        return;
      }
      Alert.alert(
        'Payment Failed',
        err?.response?.data?.message || err?.message || 'Could not process payment'
      );
    },
  });

  const handlePay = () => {
    if (method === 'razorpay') {
      Alert.alert(
        'Proceed with Razorpay?',
        `Pay ₹${amount} for booking at ${restaurantName}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pay Now', onPress: () => payMutation.mutate() },
        ]
      );
    } else {
      payMutation.mutate();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Amount Summary */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amount}>₹{amount || 0}</Text>
          <Text style={styles.forText}>for {restaurantName}</Text>
        </View>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Choose Payment Method</Text>
        {PAYMENT_METHODS.map((pm) => {
          const isWalletDisabled = pm.id === 'wallet' && walletBalance < (amount || 0);
          return (
            <TouchableOpacity
              key={pm.id}
              style={[
                styles.methodCard,
                method === pm.id && styles.methodCardActive,
                isWalletDisabled && styles.methodCardDisabled,
              ]}
              onPress={() => !isWalletDisabled && setMethod(pm.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.methodIcon}>{pm.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.methodLabel, method === pm.id && styles.methodLabelActive]}>
                  {pm.label}
                </Text>
                <Text style={styles.methodDesc}>
                  {pm.id === 'wallet'
                    ? `Balance: ₹${walletBalance}${isWalletDisabled ? ' (insufficient)' : ''}`
                    : pm.desc}
                </Text>
              </View>
              <View style={[styles.radio, method === pm.id && styles.radioActive]}>
                {method === pm.id && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>Your payment is 100% secure and encrypted</Text>
        </View>
      </ScrollView>

      {/* Pay Button */}
      <View style={styles.footer}>
        <View style={styles.footerMeta}>
          <Text style={styles.footerLabel}>Paying via</Text>
          <Text style={styles.footerMethod}>
            {PAYMENT_METHODS.find((m) => m.id === method)?.label}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.payBtn, payMutation.isPending && { opacity: 0.6 }]}
          onPress={handlePay}
          disabled={payMutation.isPending}
        >
          {payMutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.payBtnText}>
                {method === 'cash' ? 'Confirm Booking' : `Pay ₹${amount || 0}`}
              </Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F1' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EAE2D6',
  },
  backBtn: { padding: 8 },
  backText: { fontSize: 22, color: COLORS.primary },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B18' },
  scroll: { padding: SPACING.md, paddingBottom: 120 },
  amountCard: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg,
    padding: 28, alignItems: 'center', marginBottom: SPACING.lg,
  },
  amountLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 6 },
  amount: { color: '#fff', fontSize: 48, fontWeight: '900', marginBottom: 4 },
  forText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E1B18', marginBottom: 12 },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
    marginBottom: 12, borderWidth: 2, borderColor: 'transparent',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  methodCardActive: { borderColor: COLORS.primary, backgroundColor: '#F6F1E8' },
  methodCardDisabled: { opacity: 0.4 },
  methodIcon: { fontSize: 28 },
  methodLabel: { fontSize: 15, fontWeight: '700', color: '#1E1B18', marginBottom: 2 },
  methodLabelActive: { color: COLORS.primary },
  methodDesc: { fontSize: 12, color: '#6F6862' },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: '#A79E95', justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: COLORS.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  securityNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FBF7F1', borderRadius: 10, padding: 14, marginTop: 8,
  },
  securityIcon: { fontSize: 18 },
  securityText: { fontSize: 12, color: '#6F6862', flex: 1 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', padding: SPACING.md, paddingBottom: 32,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderTopWidth: 1, borderTopColor: '#EAE2D6',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 },
  },
  footerMeta: { flex: 1 },
  footerLabel: { fontSize: 11, color: '#6F6862' },
  footerMethod: { fontSize: 14, fontWeight: '700', color: '#1E1B18' },
  payBtn: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, paddingHorizontal: 28, paddingVertical: 16 },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
