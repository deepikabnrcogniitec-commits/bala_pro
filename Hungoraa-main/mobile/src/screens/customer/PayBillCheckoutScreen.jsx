// Pay Bill — step 3: choose how to pay (UPI · Card · Net Banking · Wallet).
// Card / bank credentials are never collected here — they are entered on the
// payment gateway's own secure page.
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import billPaymentApi from '../../api/billPayment.api';
import paymentApi from '../../api/payment.api';
import { COLOR, FONT, RADII, SPACING, ELEVATION } from '../../theme';
import {
  PayBillHeader, FooterCTA, Section, NAVY, GOLD, GOLD_DEEP, CREAM, PAGE_BG, GREEN, inr,
} from './paybill/common';

const UPI_APPS = [
  { id: 'gpay', name: 'Google Pay', letter: 'G', color: '#1A73E8' },
  { id: 'phonepe', name: 'PhonePe', letter: 'Pe', color: '#5F259F' },
  { id: 'paytm', name: 'Paytm', letter: 'P', color: '#00BAF2' },
  { id: 'bhim', name: 'BHIM UPI', letter: 'B', color: '#F47B20' },
];
const BANKS = [
  { id: 'sbi', name: 'SBI', color: '#22409A' },
  { id: 'hdfc', name: 'HDFC', color: '#004C8F' },
  { id: 'icici', name: 'ICICI', color: '#B02A30' },
  { id: 'axis', name: 'Axis', color: '#97144D' },
  { id: 'kotak', name: 'Kotak', color: '#ED1C24' },
  { id: 'other', name: 'Others', color: COLOR.blueSoft },
];
const UPI_ID_RE = /^[\w.\-]{2,}@[a-zA-Z]{2,}$/;

// Backend enum: razorpay | wallet | card | upi
const backendMethod = (m) => (m.startsWith('upi') ? 'upi' : m === 'debit' || m === 'credit' ? 'card' : m === 'wallet' ? 'wallet' : 'razorpay');

function Radio({ on }) {
  return <View style={[p.radio, on && p.radioOn]}>{on ? <View style={p.radioDot} /> : null}</View>;
}

function MethodRow({ on, onPress, icon, iconBg, iconColor = '#fff', letter, title, sub, right, disabled }) {
  return (
    <TouchableOpacity
      style={[p.row, on && p.rowOn, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <View style={[p.icon, { backgroundColor: iconBg }]}>
        {letter ? <Text style={[p.letter, { color: iconColor }]}>{letter}</Text> : <Ionicons name={icon} size={18} color={iconColor} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={p.title}>{title}</Text>
        {sub ? <Text style={p.sub}>{sub}</Text> : null}
      </View>
      {right}
      <Radio on={on} />
    </TouchableOpacity>
  );
}

export default function PayBillCheckoutScreen({ navigation, route }) {
  const { restaurant, amount, tip, offerId, offerCode, toPay, discount, appDiscount = 0 } = route.params;
  const [method, setMethod] = useState('upi:gpay');
  const [upiId, setUpiId] = useState('');
  const qc = useQueryClient();

  // Same key + raw-response shape as WalletScreen / ProfileScreen (shared cache).
  const { data: walletRes } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => paymentApi.getWallet(),
    retry: false,
  });
  const walletBalance = Number(walletRes?.data?.data?.wallet?.balance) || 0;
  const walletShort = walletBalance < toPay;

  const upiIdInvalid = method === 'upi:id' && !UPI_ID_RE.test(upiId.trim());

  const pay = useMutation({
    mutationFn: async () => {
      // Keep the processing sheet up long enough to read — feels deliberate, not glitchy.
      const [res] = await Promise.all([
        billPaymentApi.pay({
          restaurantId: restaurant._id, billAmount: amount, offerId, offerCode,
          tipAmount: tip, paymentMethod: backendMethod(method),
        }),
        new Promise((r) => setTimeout(r, 1400)),
      ]);
      return res.data.data;
    },
    onSuccess: (data) => {
      if (data.billPayment?.paymentStatus === 'paid') {
        qc.invalidateQueries({ queryKey: ['wallet'] }); // debit and/or coins credited
        navigation.reset({
          index: 1,
          routes: [
            { name: 'HomeMain' },
            {
              name: 'PayBillSuccess',
              params: { billPayment: data.billPayment, coinsEarned: data.coinsEarned, restaurantName: restaurant.name },
            },
          ],
        });
      } else if (data.razorpay) {
        Toast.show({
          type: 'info',
          text1: 'Online checkout coming soon',
          text2: 'Please pay with Hungora Wallet for now.',
        });
      } else {
        Toast.show({ type: 'error', text1: 'Payment could not be completed' });
      }
    },
    onError: (err) => Toast.show({
      type: 'error', text1: 'Payment failed', text2: err.response?.data?.message || 'Please try again',
    }),
  });

  const methodLabel = method.startsWith('upi') ? 'UPI' : method === 'debit' ? 'Debit card'
    : method === 'credit' ? 'Credit card' : method === 'wallet' ? 'Hungora Wallet' : 'Net Banking';

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <StatusBar style="light" />
      <PayBillHeader restaurant={restaurant} step={3} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: SPACING.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Amount summary */}
          <View style={p.summary}>
            <View>
              <Text style={p.sumLabel}>Amount payable</Text>
              <Text style={p.sumValue}>{inr(toPay)}</Text>
            </View>
            {discount > 0 ? (
              <View style={p.savePill}>
                <Ionicons name="pricetag" size={12} color={GREEN} />
                <Text style={p.saveText}>
                  Saved {inr(discount)}{appDiscount > 0 ? ` · incl. ${inr(appDiscount)} app discount` : ''}
                </Text>
              </View>
            ) : null}
          </View>

          {/* UPI */}
          <Section title="UPI" right={<Text style={p.tag}>Recommended</Text>}>
            {UPI_APPS.map((app) => (
              <MethodRow
                key={app.id}
                on={method === `upi:${app.id}`}
                onPress={() => setMethod(`upi:${app.id}`)}
                letter={app.letter}
                iconBg={app.color}
                title={app.name}
              />
            ))}
            <MethodRow
              on={method === 'upi:id'}
              onPress={() => setMethod('upi:id')}
              icon="at"
              iconBg={COLOR.blueTint}
              iconColor={NAVY}
              title="Pay via UPI ID"
              sub="yourname@okbank"
            />
            {method === 'upi:id' ? (
              <View>
                <TextInput
                  style={[p.upiInput, upiId && upiIdInvalid && { borderColor: COLOR.error }]}
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="Enter UPI ID"
                  placeholderTextColor={COLOR.inkFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoFocus
                />
                {upiId && upiIdInvalid ? <Text style={p.err}>Enter a valid UPI ID, e.g. name@okhdfcbank</Text> : null}
              </View>
            ) : null}
          </Section>

          {/* Cards */}
          <Section title="Cards">
            <MethodRow
              on={method === 'credit'}
              onPress={() => setMethod('credit')}
              icon="card"
              iconBg={NAVY}
              title="Credit card"
              sub="Visa · Mastercard · RuPay · Amex"
            />
            <MethodRow
              on={method === 'debit'}
              onPress={() => setMethod('debit')}
              icon="card-outline"
              iconBg={COLOR.blueSoft}
              title="Debit card"
              sub="All major Indian banks"
            />
            {method === 'credit' || method === 'debit' ? (
              <View style={p.note}>
                <Ionicons name="lock-closed" size={12} color={COLOR.inkSoft} />
                <Text style={p.noteText}>You’ll enter card details on the bank’s secure page. We never store them.</Text>
              </View>
            ) : null}
          </Section>

          {/* Net banking */}
          <Section title="Net Banking">
            <View style={p.bankGrid}>
              {BANKS.map((b) => {
                const on = method === `nb:${b.id}`;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[p.bank, on && p.bankOn]}
                    onPress={() => setMethod(`nb:${b.id}`)}
                    activeOpacity={0.85}
                  >
                    <View style={[p.bankLogo, { backgroundColor: b.color }]}>
                      {b.id === 'other'
                        ? <Ionicons name="business" size={14} color="#fff" />
                        : <Text style={p.bankLetter}>{b.name.charAt(0)}</Text>}
                    </View>
                    <Text style={[p.bankName, on && { color: NAVY, fontFamily: FONT.bold }]}>{b.name}</Text>
                    {on ? <Ionicons name="checkmark-circle" size={16} color={GOLD_DEEP} style={p.bankTick} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Section>

          {/* Wallet */}
          <Section title="Hungora Wallet">
            <MethodRow
              on={method === 'wallet'}
              onPress={() => setMethod('wallet')}
              icon="wallet"
              iconBg={GOLD}
              title="Hungora Wallet"
              sub={walletShort ? `Balance ${inr(walletBalance)} · insufficient` : `Balance ${inr(walletBalance)}`}
              disabled={walletShort}
            />
          </Section>

          <View style={p.secure}>
            <Ionicons name="shield-checkmark" size={14} color={GREEN} />
            <Text style={p.secureText}>100% secure payments · PCI-DSS compliant gateway</Text>
          </View>

          <View style={{ height: 130 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <FooterCTA
        label={`Pay ${inr(toPay)}`}
        sub={`via ${methodLabel}`}
        icon="lock-closed"
        disabled={upiIdInvalid || (method === 'wallet' && walletShort)}
        onPress={() => pay.mutate()}
      />

      {/* Processing sheet */}
      <Modal visible={pay.isPending} transparent animationType="fade" statusBarTranslucent>
        <View style={p.overlay}>
          <View style={p.processing}>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={p.procTitle}>Processing payment</Text>
            <Text style={p.procSub}>{inr(toPay)} to {restaurant.name}</Text>
            <Text style={p.procHint}>Please don’t close the app or press back</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const p = StyleSheet.create({
  summary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: NAVY, borderRadius: RADII.lg, padding: SPACING.lg, ...ELEVATION.md,
  },
  sumLabel: { fontFamily: FONT.medium, fontSize: 12, color: COLOR.onNavySoft, textTransform: 'uppercase', letterSpacing: 1 },
  sumValue: { fontFamily: FONT.display, fontSize: 30, color: '#fff', marginTop: 2 },
  savePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLOR.successTint,
    borderRadius: RADII.pill, paddingHorizontal: 10, paddingVertical: 5,
  },
  saveText: { fontFamily: FONT.bold, fontSize: 12, color: GREEN },
  tag: {
    fontFamily: FONT.bold, fontSize: 10, color: GREEN, backgroundColor: COLOR.successTint,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADII.pill, overflow: 'hidden',
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 10, paddingHorizontal: SPACING.xs,
    borderRadius: RADII.md, borderWidth: 1, borderColor: 'transparent',
  },
  rowOn: { borderColor: GOLD, backgroundColor: '#FFFBF1' },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: FONT.bold, fontSize: 14 },
  title: { fontFamily: FONT.semiBold, fontSize: 15, color: COLOR.ink },
  sub: { fontFamily: FONT.regular, fontSize: 12, color: COLOR.inkSoft, marginTop: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLOR.border, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: GOLD_DEEP },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD_DEEP },

  upiInput: {
    marginTop: SPACING.xs, borderWidth: 1, borderColor: COLOR.border, borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 11, fontFamily: FONT.medium, fontSize: 15, color: COLOR.ink,
  },
  err: { fontFamily: FONT.regular, fontSize: 12, color: COLOR.error, marginTop: 4 },
  note: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.xs,
    backgroundColor: PAGE_BG, borderRadius: RADII.sm, padding: SPACING.xs,
  },
  noteText: { flex: 1, fontFamily: FONT.regular, fontSize: 12, color: COLOR.inkSoft },

  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  bank: {
    width: '31.5%', alignItems: 'center', gap: 6, paddingVertical: SPACING.sm,
    borderRadius: RADII.md, borderWidth: 1, borderColor: COLOR.hairline, backgroundColor: PAGE_BG,
  },
  bankOn: { borderColor: GOLD, backgroundColor: '#FFFBF1' },
  bankLogo: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  bankLetter: { fontFamily: FONT.bold, fontSize: 14, color: '#fff' },
  bankName: { fontFamily: FONT.medium, fontSize: 12, color: COLOR.ink },
  bankTick: { position: 'absolute', top: 6, right: 6 },

  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.lg },
  secureText: { fontFamily: FONT.medium, fontSize: 12, color: COLOR.inkSoft },

  overlay: { flex: 1, backgroundColor: 'rgba(8,20,35,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  processing: {
    width: '100%', backgroundColor: '#fff', borderRadius: RADII.xl, alignItems: 'center',
    paddingVertical: SPACING.xxl, paddingHorizontal: SPACING.lg, ...ELEVATION.lg,
  },
  procTitle: { fontFamily: FONT.display, fontSize: 20, color: NAVY, marginTop: SPACING.md },
  procSub: { fontFamily: FONT.semiBold, fontSize: 14, color: COLOR.ink, marginTop: 4 },
  procHint: { fontFamily: FONT.regular, fontSize: 12, color: COLOR.inkFaint, marginTop: SPACING.sm },
});
