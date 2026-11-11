// Pay Bill — step 1: pick a restaurant (from the Pay Bill tab) and enter the
// bill amount. "Check offers" moves on to PayBillReview.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
  FlatList, KeyboardAvoidingView, Platform, Animated, Easing, Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import billPaymentApi from '../../api/billPayment.api';
import restaurantApi from '../../api/restaurant.api';
import { rankOffers } from '../../utils/offers';
import { COLOR, FONT, RADII, SPACING, ELEVATION } from '../../theme';
import {
  PayBillHeader, FooterCTA, usePayBillOffers, NAVY, GOLD, GOLD_DEEP, CREAM, PAGE_BG, GREEN, inr,
} from './paybill/common';

const QUICK_AMOUNTS = [500, 1000, 1500, 2000, 3000, 5000];

const topOfferBadge = (o) => {
  if (!o) return null;
  if (o.type === 'percentage') return `Up to ${o.discountValue}% OFF`;
  if (o.type === 'flat') return `Flat ₹${o.discountValue} OFF`;
  return 'Offer available';
};

// ── Restaurant picker (only when opened from the Pay Bill tab) ────────────────
function RestaurantPicker({ onSelect }) {
  const [search, setSearch] = useState('');

  // Try the Pay-Bill list first (it carries offer badges); fall back to the
  // general restaurant list so this screen is never mysteriously empty.
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['pay-bill-restaurants'],
    queryFn: async () => {
      try {
        const r = await billPaymentApi.getRestaurants({});
        const list = r.data?.data?.restaurants || [];
        if (list.length) return list;
      } catch { /* fall through */ }
      const r2 = await restaurantApi.getAll({ limit: 50, sortBy: 'rating' });
      return r2.data?.data?.restaurants || [];
    },
    retry: 1,
  });

  const q = search.trim().toLowerCase();
  const restaurants = (data || []).filter(
    (x) => !q || x.name?.toLowerCase().includes(q) || x.address?.city?.toLowerCase().includes(q),
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={rp.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLOR.inkFaint} />
        <TextInput
          style={rp.searchInput}
          placeholder="Search for a restaurant…"
          placeholderTextColor={COLOR.inkFaint}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLOR.inkFaint} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={rp.center}><ActivityIndicator color={NAVY} /></View>
      ) : isError ? (
        <View style={rp.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={COLOR.inkFaint} />
          <Text style={rp.emptyTitle}>Couldn’t load restaurants</Text>
          <Text style={rp.emptySub}>Check your internet connection and try again.</Text>
          <TouchableOpacity style={rp.retryBtn} onPress={() => refetch()}>
            <Text style={rp.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : restaurants.length === 0 ? (
        <View style={rp.center}>
          <Text style={{ fontSize: 40 }}>🍽️</Text>
          <Text style={rp.emptyTitle}>{search ? 'No matches' : 'No restaurants yet'}</Text>
          <Text style={rp.emptySub}>
            {search ? 'Try a different name.' : 'Restaurants will appear here once they’re live.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 24 }}
          ListHeaderComponent={<Text style={rp.listHead}>{search ? 'Results' : 'Pay your bill at'}</Text>}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          renderItem={({ item }) => {
            const img = item.images?.[0]?.url || item.logo?.url;
            const badge = topOfferBadge(item.topOffer);
            return (
              <TouchableOpacity style={rp.card} onPress={() => onSelect(item)} activeOpacity={0.9}>
                {img ? <Image source={{ uri: img }} style={rp.thumb} /> : (
                  <View style={[rp.thumb, rp.thumbFallback]}><Text style={rp.avatarText}>{item.name?.charAt(0)}</Text></View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={rp.cardTopRow}>
                    <Text style={rp.name} numberOfLines={1}>{item.name}</Text>
                    {item.averageRating > 0 ? (
                      <View style={rp.ratingChip}>
                        <Ionicons name="star" size={10} color="#fff" />
                        <Text style={rp.ratingText}>{item.averageRating.toFixed(1)}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={rp.address} numberOfLines={1}>
                    {[item.cuisine?.slice(0, 2).join(', '), item.address?.city].filter(Boolean).join(' · ')}
                  </Text>
                  {badge ? (
                    <View style={rp.offerBadge}>
                      <Ionicons name="pricetag" size={10} color={GOLD_DEEP} />
                      <Text style={rp.offerBadgeText}>{badge}</Text>
                    </View>
                  ) : (
                    <Text style={rp.payHint}>Pay bill · earn Hungora coins</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLOR.inkFaint} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

// ── Step 1: amount ───────────────────────────────────────────────────────────
function AmountStep({ navigation, restaurant, initialAmount, initialOfferId }) {
  const [amount, setAmount] = useState(initialAmount ? String(Math.round(initialAmount)) : '');
  const amt = parseFloat(amount) || 0;
  const { data: offers = [] } = usePayBillOffers(restaurant._id);

  // Teaser: best saving on this amount, or the headline offer before any amount.
  const best = useMemo(() => rankOffers(offers, amt)[0] || null, [offers, amt]);
  const headline = useMemo(() => {
    const pct = offers.filter((o) => o.type === 'percentage').sort((a, b) => b.discountValue - a.discountValue)[0];
    return pct ? `up to ${pct.discountValue}% off` : offers[0] ? 'special offers' : null;
  }, [offers]);

  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(pop, { toValue: amt > 0 ? 1 : 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [amt > 0]);

  const next = () => navigation.navigate('PayBillReview', {
    restaurant, amount: amt, offerId: initialOfferId || undefined,
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={a.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={a.card}>
          <Text style={a.label}>Enter bill amount</Text>
          <View style={a.amountRow}>
            <Text style={[a.rupee, !amt && { color: COLOR.inkFaint }]}>₹</Text>
            <TextInput
              style={a.input}
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={COLOR.inkFaint}
              autoFocus={!initialAmount}
              maxLength={7}
              returnKeyType="done"
              onSubmitEditing={() => amt > 0 && next()}
            />
          </View>
          <View style={[a.underline, amt > 0 && { backgroundColor: GOLD }]} />
          <Text style={a.hint}>Enter the total shown on your restaurant bill</Text>

          <View style={a.quickRow}>
            {QUICK_AMOUNTS.map((q) => {
              const on = amount === String(q);
              return (
                <TouchableOpacity key={q} style={[a.chip, on && a.chipOn]} activeOpacity={0.8} onPress={() => setAmount(String(q))}>
                  <Text style={[a.chipText, on && a.chipTextOn]}>₹{q.toLocaleString('en-IN')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {offers.length ? (
          <Animated.View
            style={[a.teaser, {
              transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }],
            }]}
          >
            <View style={a.teaserIcon}><Ionicons name="gift" size={18} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={a.teaserTitle}>
                {offers.length} offer{offers.length > 1 ? 's' : ''} available{headline ? ` · ${headline}` : ''}
              </Text>
              <Text style={a.teaserSub}>
                {amt > 0 && best?.discount > 0
                  ? `Save up to ${inr(best.discount)} on this bill`
                  : amt > 0 ? 'Check which offers apply to this bill' : 'Enter your amount to see your savings'}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        <View style={a.trust}>
          {[
            { icon: 'shield-checkmark-outline', text: 'Secure payment' },
            { icon: 'flash-outline', text: 'Instant receipt' },
            { icon: 'sparkles-outline', text: 'Earn coins' },
          ].map((t) => (
            <View key={t.text} style={a.trustItem}>
              <Ionicons name={t.icon} size={16} color={COLOR.blueSoft} />
              <Text style={a.trustText}>{t.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <FooterCTA
        label={amt > 0 ? 'Check offers' : 'Enter an amount'}
        sub={amt > 0 ? `Bill amount ${inr(amt)}` : undefined}
        icon="pricetags"
        disabled={amt <= 0}
        onPress={next}
      />
    </KeyboardAvoidingView>
  );
}

// ── Screen shell ─────────────────────────────────────────────────────────────
export default function PayBillScreen({ navigation, route }) {
  const preRestaurant = route.params?.restaurant || null;
  const [restaurant, setRestaurant] = useState(preRestaurant);

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <StatusBar style="light" />
      <PayBillHeader
        restaurant={restaurant}
        step={restaurant ? 1 : null}
        subtitle={restaurant ? undefined : 'Choose where you dined'}
        onBack={() => (restaurant && !preRestaurant ? setRestaurant(null) : navigation.goBack())}
      />
      {restaurant ? (
        <AmountStep
          navigation={navigation}
          restaurant={restaurant}
          initialAmount={route.params?.billAmount}
          initialOfferId={route.params?.offerId}
        />
      ) : (
        <RestaurantPicker onSelect={setRestaurant} />
      )}
    </View>
  );
}

const a = StyleSheet.create({
  scroll: { padding: SPACING.lg },
  card: {
    backgroundColor: '#fff', borderRadius: RADII.xl, paddingVertical: SPACING.xl, paddingHorizontal: SPACING.lg,
    ...ELEVATION.md,
  },
  label: {
    fontFamily: FONT.semiBold, fontSize: 12, color: COLOR.inkSoft, textAlign: 'center',
    textTransform: 'uppercase', letterSpacing: 1.4,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.md },
  rupee: { fontFamily: FONT.display, fontSize: 34, color: NAVY, marginRight: 4 },
  input: { fontFamily: FONT.display, fontSize: 56, color: NAVY, minWidth: 80, textAlign: 'center', padding: 0 },
  underline: { height: 3, width: 140, borderRadius: 2, backgroundColor: COLOR.hairline, alignSelf: 'center', marginTop: 6 },
  hint: { fontFamily: FONT.regular, fontSize: 12, color: COLOR.inkFaint, textAlign: 'center', marginTop: SPACING.sm },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SPACING.xs, marginTop: SPACING.lg },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADII.pill,
    borderWidth: 1, borderColor: COLOR.hairline, backgroundColor: PAGE_BG,
  },
  chipOn: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontFamily: FONT.semiBold, fontSize: 12, color: COLOR.ink },
  chipTextOn: { color: GOLD },

  teaser: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md,
    backgroundColor: CREAM, borderRadius: RADII.lg, padding: SPACING.md, borderWidth: 1, borderColor: '#EAD4A3',
  },
  teaserIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: GOLD_DEEP, alignItems: 'center', justifyContent: 'center' },
  teaserTitle: { fontFamily: FONT.bold, fontSize: 14, color: NAVY },
  teaserSub: { fontFamily: FONT.regular, fontSize: 12, color: GOLD_DEEP, marginTop: 2 },

  trust: { flexDirection: 'row', justifyContent: 'space-around', marginTop: SPACING.xl },
  trustItem: { alignItems: 'center', gap: 4 },
  trustText: { fontFamily: FONT.medium, fontSize: 11, color: COLOR.inkSoft },
});

const rp = StyleSheet.create({
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, backgroundColor: '#fff',
    margin: SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: 10,
    borderRadius: RADII.md, borderWidth: 1, borderColor: COLOR.hairline,
  },
  searchInput: { flex: 1, fontFamily: FONT.regular, fontSize: 15, color: COLOR.ink },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: SPACING.xl },
  emptyTitle: { fontFamily: FONT.bold, fontSize: 15, color: COLOR.ink, marginTop: 4 },
  emptySub: { fontFamily: FONT.regular, fontSize: 13, color: COLOR.inkSoft, textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: SPACING.md, backgroundColor: NAVY, borderRadius: RADII.pill, paddingHorizontal: SPACING.xl, paddingVertical: 10 },
  retryText: { fontFamily: FONT.bold, fontSize: 13, color: '#fff' },
  listHead: {
    fontFamily: FONT.bold, fontSize: 11, color: COLOR.inkSoft,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.xs, marginLeft: 4,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: '#fff',
    marginBottom: SPACING.xs, borderRadius: RADII.md, padding: SPACING.xs, ...ELEVATION.sm,
  },
  thumb: { width: 60, height: 60, borderRadius: RADII.sm, backgroundColor: PAGE_BG },
  thumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: NAVY },
  avatarText: { fontFamily: FONT.bold, fontSize: 18, color: '#fff' },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontFamily: FONT.bold, fontSize: 15, color: COLOR.ink },
  address: { fontFamily: FONT.regular, fontSize: 12, color: COLOR.inkSoft, marginTop: 2 },
  ratingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: GREEN,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  ratingText: { fontFamily: FONT.bold, fontSize: 11, color: '#fff' },
  offerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 5,
    backgroundColor: CREAM, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  offerBadgeText: { fontFamily: FONT.bold, fontSize: 10, color: GOLD_DEEP, letterSpacing: 0.3 },
  payHint: { fontFamily: FONT.regular, fontSize: 11, color: COLOR.inkFaint, marginTop: 5 },
});
