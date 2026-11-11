// Pay Bill — step 2: pick an offer / coupon, see the bill like a printed
// receipt, then "Proceed to pay".
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import dayjs from 'dayjs';
import offerApi from '../../api/offer.api';
import { offerValueLabel, offerFunderLabel, rankOffers } from '../../utils/offers';
import { COLOR, FONT, RADII, SPACING, ELEVATION } from '../../theme';
import {
  PayBillHeader, FooterCTA, Section, CountUp, usePayBillOffers, useBillQuote,
  NAVY, GOLD, GOLD_DEEP, CREAM, PAGE_BG, GREEN, inr,
} from './paybill/common';

const TIP_OPTIONS = [20, 50, 100];

// Row of small diamonds — the torn edge of a paper receipt.
function ZigZag({ flip }) {
  return (
    <View style={[z.row, flip && { transform: [{ rotate: '180deg' }] }]}>
      {Array.from({ length: 26 }).map((_, i) => <View key={i} style={z.tooth} />)}
    </View>
  );
}

function BillRow({ label, sub, value, tone, strikeValue, free, bold }) {
  const color = tone === 'green' ? GREEN : tone === 'muted' ? COLOR.inkSoft : COLOR.ink;
  return (
    <View style={r.row}>
      <View style={{ flex: 1, paddingRight: SPACING.sm }}>
        <Text style={[r.label, bold && r.bold, { color: bold ? NAVY : COLOR.inkSoft }]}>{label}</Text>
        {sub ? <Text style={r.sub} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {free ? (
        <Text style={r.value}>
          <Text style={r.strike}>{strikeValue}</Text>{'  '}<Text style={r.free}>FREE</Text>
        </Text>
      ) : (
        <Text style={[r.value, bold && r.bold, { color }]}>{value}</Text>
      )}
    </View>
  );
}

export default function PayBillReviewScreen({ navigation, route }) {
  const { restaurant, amount } = route.params;
  const { data: offers = [], isLoading: offersLoading } = usePayBillOffers(restaurant._id);

  const ranked = useMemo(() => rankOffers(offers, amount), [offers, amount]);
  const bestId = ranked.find((x) => x.discount > 0)?.offer._id || null;

  // undefined = auto (best), null = "no offer", id = user pick
  const [pickedId, setPickedId] = useState(route.params?.offerId);
  const [coupon, setCoupon] = useState(null); // { code, title }
  const [code, setCode] = useState('');
  const [showCoupon, setShowCoupon] = useState(false);
  const [tip, setTip] = useState(0);

  const offerId = coupon ? undefined : (pickedId === undefined ? bestId : pickedId) || undefined;
  const { data: quote, isFetching } = useBillQuote({
    restaurantId: restaurant._id, amount, offerId, offerCode: coupon?.code, tip,
  });

  const discount = quote?.discount ?? 0;           // offer + app discount
  const appDiscount = quote?.appDiscount ?? 0;
  const offerDiscount = quote?.offerDiscount ?? discount - appDiscount;
  const fee = quote?.convenienceFee ?? 0;
  const gst = quote?.gstAmount ?? 0;
  const toPay = quote?.toPay ?? amount + tip;
  const activeOffer = coupon ? quote?.offer : offers.find((o) => o._id === offerId);

  const applyCoupon = useMutation({
    mutationFn: () => offerApi.validateCoupon({
      code: code.trim().toUpperCase(), restaurantId: restaurant._id, amount, guests: 1,
    }).then((res) => res.data.data),
    onSuccess: (d) => {
      setCoupon({ code: code.trim().toUpperCase(), title: d.offer?.title });
      setShowCoupon(false);
      Toast.show({ type: 'success', text1: 'Coupon applied', text2: `You save ${inr(d.discountBreakup?.total)}` });
    },
    onError: (err) => Toast.show({
      type: 'error', text1: 'Invalid coupon', text2: err.response?.data?.message || 'Not valid for this bill',
    }),
  });

  const proceed = () => navigation.navigate('PayBillCheckout', {
    restaurant, amount, tip, offerId, offerCode: coupon?.code,
    toPay, discount, appDiscount, offerTitle: activeOffer?.title,
  });

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <StatusBar style="light" />
      <PayBillHeader restaurant={restaurant} step={2} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: SPACING.lg }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {discount > 0 ? (
            <View style={s.saveBanner}>
              <Text style={{ fontSize: 22 }}>🎉</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.saveTitle}>Yay! You’re saving <CountUp value={discount} style={s.saveTitle} /></Text>
                <Text style={s.saveSub} numberOfLines={2}>
                  {[
                    offerDiscount > 0 ? `${activeOffer?.title || 'Offer'} ${inr(offerDiscount)}` : null,
                    appDiscount > 0 ? `App discount ${inr(appDiscount)}` : null,
                  ].filter(Boolean).join('  +  ')}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Offers */}
          <Section title="Offers for you" style={{ marginTop: discount > 0 ? SPACING.md : 0 }}>
            {offersLoading ? <ActivityIndicator color={NAVY} style={{ marginVertical: SPACING.md }} /> : null}
            {!offersLoading && !offers.length ? (
              <Text style={s.none}>No offers at this restaurant right now — you’ll still earn Hungora coins.</Text>
            ) : null}
            {ranked.map(({ offer: o, discount: d }) => {
              const locked = amount < (o.minOrderAmount || 0);
              const on = !coupon && offerId === o._id;
              return (
                <TouchableOpacity
                  key={o._id}
                  activeOpacity={0.85}
                  disabled={locked}
                  onPress={() => { setCoupon(null); setPickedId(on ? null : o._id); }}
                  style={[s.offer, on && s.offerOn, locked && { opacity: 0.55 }]}
                >
                  <View style={[s.offerIcon, on && { backgroundColor: GOLD_DEEP }]}>
                    <Ionicons name="pricetag" size={15} color={on ? '#fff' : GOLD_DEEP} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.offerTitle} numberOfLines={1}>{offerValueLabel(o)}</Text>
                      {o._id === bestId ? <View style={s.bestTag}><Text style={s.bestText}>BEST</Text></View> : null}
                    </View>
                    <Text style={s.offerSub} numberOfLines={1}>{offerFunderLabel(o)} · {o.title}</Text>
                    <Text style={[s.offerSave, locked && { color: COLOR.inkSoft }]}>
                      {locked ? `Add ${inr(o.minOrderAmount - amount)} more to unlock`
                        : d > 0 ? `You save ${inr(d)}` : 'Applied at the restaurant'}
                    </Text>
                  </View>
                  <Ionicons
                    name={on ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={on ? GOLD_DEEP : COLOR.border}
                  />
                </TouchableOpacity>
              );
            })}

            {/* Coupon */}
            {coupon ? (
              <View style={[s.offer, s.offerOn]}>
                <View style={[s.offerIcon, { backgroundColor: GOLD_DEEP }]}><Ionicons name="ticket" size={15} color="#fff" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.offerTitle}>{coupon.code} applied</Text>
                  <Text style={s.offerSub} numberOfLines={1}>{coupon.title}</Text>
                </View>
                <TouchableOpacity onPress={() => { setCoupon(null); setCode(''); }} hitSlop={8}>
                  <Text style={s.remove}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.couponHead} onPress={() => setShowCoupon((v) => !v)} activeOpacity={0.8}>
                <Ionicons name="ticket-outline" size={18} color={GOLD_DEEP} />
                <Text style={s.couponHeadText}>Have a coupon code?</Text>
                <Ionicons name={showCoupon ? 'chevron-up' : 'chevron-down'} size={16} color={COLOR.inkFaint} />
              </TouchableOpacity>
            )}
            {showCoupon && !coupon ? (
              <View style={s.couponRow}>
                <TextInput
                  style={s.couponInput}
                  value={code}
                  onChangeText={(t) => setCode(t.toUpperCase())}
                  placeholder="ENTER CODE"
                  placeholderTextColor={COLOR.inkFaint}
                  autoCapitalize="characters"
                  autoFocus
                />
                <TouchableOpacity
                  style={[s.couponBtn, (!code || applyCoupon.isPending) && { opacity: 0.5 }]}
                  disabled={!code || applyCoupon.isPending}
                  onPress={() => applyCoupon.mutate()}
                >
                  {applyCoupon.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.couponBtnText}>Apply</Text>}
                </TouchableOpacity>
              </View>
            ) : null}
          </Section>

          {/* Tip */}
          <Section title="Tip the staff" right={<Text style={s.optional}>Optional</Text>}>
            <View style={s.tipRow}>
              {TIP_OPTIONS.map((t) => {
                const on = tip === t;
                return (
                  <TouchableOpacity key={t} style={[s.tip, on && s.tipOn]} onPress={() => setTip(on ? 0 : t)} activeOpacity={0.85}>
                    <Text style={[s.tipText, on && { color: GOLD }]}>{inr(t)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={s.tipNote}>100% of the tip goes to the restaurant team.</Text>
          </Section>

          {/* Receipt */}
          <View style={s.receiptWrap}>
            <ZigZag />
            <View style={s.receipt}>
              <View style={s.receiptHead}>
                <Ionicons name="receipt-outline" size={20} color={NAVY} />
                <Text style={s.receiptTitle}>Bill summary</Text>
                {isFetching ? <ActivityIndicator size="small" color={COLOR.inkFaint} style={{ marginLeft: 'auto' }} /> : null}
              </View>
              <Text style={s.receiptMeta}>{restaurant.name} · {dayjs().format('DD MMM YYYY, h:mm A')}</Text>
              <View style={s.dashed} />

              <BillRow label="Bill amount" value={inr(amount)} />
              {offerDiscount > 0 ? (
                <BillRow
                  label={activeOffer?.fundedBy === 'bank' ? 'Bank discount' : 'Offer discount'}
                  sub={activeOffer?.title || coupon?.code}
                  value={`− ${inr(offerDiscount)}`}
                  tone="green"
                />
              ) : null}
              {appDiscount > 0 ? (
                <BillRow
                  label="Hungora app discount"
                  sub={`${quote?.appDiscountLabel ? `${quote.appDiscountLabel} · ` : ''}for paying on the app`}
                  value={`− ${inr(appDiscount)}`}
                  tone="green"
                />
              ) : null}
              {discount > 0 ? (
                <BillRow label="Amount after discount" value={inr(Math.max(0, amount - discount))} />
              ) : null}
              {quote?.convenienceFeeWaived ? (
                <BillRow label="Convenience fee" free strikeValue={inr(quote.convenienceFeeOriginal)} />
              ) : fee > 0 ? (
                <BillRow label="Convenience fee" value={inr(fee)} />
              ) : null}
              {gst > 0 ? <BillRow label={`GST on fee (${quote?.gstOnFeePercent || 0}%)`} value={inr(gst)} /> : null}
              {tip > 0 ? <BillRow label="Tip" value={inr(tip)} /> : null}

              <View style={s.dashed} />
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>To pay</Text>
                <CountUp value={toPay} style={s.totalValue} />
              </View>
              {discount > 0 ? (
                <View style={s.totalSave}>
                  <Ionicons name="sparkles" size={12} color={GREEN} />
                  <Text style={s.totalSaveText}>Total savings {inr(discount)}</Text>
                </View>
              ) : null}
            </View>
            <ZigZag flip />
          </View>

          <View style={{ height: 130 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <FooterCTA
        label={`Proceed to pay ${inr(toPay)}`}
        sub={discount > 0 ? `You save ${inr(discount)}` : 'Earn Hungora coins on this bill'}
        disabled={!quote}
        onPress={proceed}
      />
    </View>
  );
}

const z = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', height: 8, overflow: 'hidden', paddingHorizontal: 2 },
  tooth: { width: 12, height: 12, backgroundColor: '#fff', transform: [{ rotate: '45deg' }], marginTop: 3 },
});

const r = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  label: { fontFamily: FONT.regular, fontSize: 14 },
  value: { fontFamily: FONT.semiBold, fontSize: 14 },
  bold: { fontFamily: FONT.bold },
  strike: { textDecorationLine: 'line-through', color: COLOR.inkFaint, fontFamily: FONT.regular },
  free: { color: GREEN, fontFamily: FONT.bold, letterSpacing: 0.6 },
  sub: { fontFamily: FONT.regular, fontSize: 11.5, color: COLOR.inkFaint, marginTop: 1 },
});

const s = StyleSheet.create({
  saveBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLOR.successTint,
    borderRadius: RADII.lg, padding: SPACING.md, borderWidth: 1, borderColor: '#B9DCC9',
  },
  saveTitle: { fontFamily: FONT.bold, fontSize: 15, color: GREEN },
  saveSub: { fontFamily: FONT.regular, fontSize: 12, color: COLOR.inkSoft, marginTop: 1 },
  none: { fontFamily: FONT.regular, fontSize: 13, color: COLOR.inkSoft, lineHeight: 19 },

  offer: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.sm, marginBottom: SPACING.xs,
    borderRadius: RADII.md, borderWidth: 1, borderColor: COLOR.hairline, borderStyle: 'dashed',
  },
  offerOn: { borderColor: GOLD, borderStyle: 'solid', backgroundColor: '#FFFBF1' },
  offerIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: CREAM, alignItems: 'center', justifyContent: 'center' },
  offerTitle: { fontFamily: FONT.bold, fontSize: 14, color: COLOR.ink, flexShrink: 1 },
  offerSub: { fontFamily: FONT.regular, fontSize: 12, color: COLOR.inkSoft, marginTop: 1 },
  offerSave: { fontFamily: FONT.semiBold, fontSize: 12, color: GREEN, marginTop: 3 },
  bestTag: { backgroundColor: GREEN, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  bestText: { fontFamily: FONT.bold, fontSize: 9, color: '#fff', letterSpacing: 0.6 },
  remove: { fontFamily: FONT.bold, fontSize: 12, color: COLOR.error },

  couponHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingVertical: SPACING.xs },
  couponHeadText: { flex: 1, fontFamily: FONT.semiBold, fontSize: 14, color: COLOR.ink },
  couponRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: 4 },
  couponInput: {
    flex: 1, borderWidth: 1, borderColor: COLOR.border, borderRadius: RADII.sm, paddingHorizontal: SPACING.sm,
    paddingVertical: 10, fontFamily: FONT.bold, fontSize: 14, letterSpacing: 1, color: COLOR.ink,
  },
  couponBtn: { backgroundColor: NAVY, borderRadius: RADII.sm, paddingHorizontal: SPACING.lg, justifyContent: 'center' },
  couponBtnText: { fontFamily: FONT.bold, fontSize: 14, color: '#fff' },

  optional: { fontFamily: FONT.medium, fontSize: 12, color: COLOR.inkFaint },
  tipRow: { flexDirection: 'row', gap: SPACING.xs },
  tip: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: RADII.md,
    borderWidth: 1, borderColor: COLOR.hairline, backgroundColor: PAGE_BG,
  },
  tipOn: { backgroundColor: NAVY, borderColor: NAVY },
  tipText: { fontFamily: FONT.bold, fontSize: 14, color: COLOR.ink },
  tipNote: { fontFamily: FONT.regular, fontSize: 11, color: COLOR.inkFaint, marginTop: SPACING.xs },

  receiptWrap: { marginTop: SPACING.lg, ...ELEVATION.sm },
  receipt: { backgroundColor: '#fff', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  receiptHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  receiptTitle: { fontFamily: FONT.display, fontSize: 18, color: NAVY },
  receiptMeta: { fontFamily: FONT.regular, fontSize: 12, color: COLOR.inkFaint, marginTop: 4 },
  dashed: { borderBottomWidth: 1, borderStyle: 'dashed', borderColor: COLOR.border, marginVertical: SPACING.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: FONT.bold, fontSize: 16, color: NAVY },
  totalValue: { fontFamily: FONT.display, fontSize: 26, color: NAVY },
  totalSave: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 4,
    backgroundColor: COLOR.successTint, borderRadius: RADII.pill, paddingHorizontal: 8, paddingVertical: 3,
  },
  totalSaveText: { fontFamily: FONT.semiBold, fontSize: 11, color: GREEN },
});
