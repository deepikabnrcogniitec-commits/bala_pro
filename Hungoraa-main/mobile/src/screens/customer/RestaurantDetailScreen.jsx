import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Share, Pressable, TextInput,
  ScrollView, Linking, Animated as RNAnimated, Easing,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedScrollHandler, useAnimatedStyle,
  interpolate, Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import restaurantApi from '../../api/restaurant.api';
import { useAppStore } from '../../store/appStore';
import { isOpenNow } from '../../components/home/viewModels';
import {
  isPayBillOffer, isBookingOffer, offerValueLabel, offerFunderLabel,
  computeDiscount, bestOffer,
} from '../../utils/offers';
import { COLOR, SPACING, RADII, ELEVATION, text, FONT } from '../../theme';
import {
  PhotoImage, IconButton, Button, Tag, Avatar, EmptyState,
} from '../../components/ui';

const { width } = Dimensions.get('window');
const HERO_H = 300;
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&q=80';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABEL = { sunday: 'Sun', monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const AMENITY_ICONS = {
  wifi: 'wifi', parking: 'car-sport-outline', valet: 'car-outline', ac: 'snow-outline',
  'air-conditioning': 'snow-outline', rooftop: 'business-outline', 'live-music': 'musical-notes-outline',
  music: 'musical-notes-outline', bar: 'wine-outline', 'full-bar': 'wine-outline', alcohol: 'wine-outline',
  outdoor: 'leaf-outline', 'outdoor-seating': 'leaf-outline', garden: 'leaf-outline',
  'pet-friendly': 'paw-outline', smoking: 'flame-outline', 'smoking-area': 'flame-outline',
  wheelchair: 'accessibility-outline', 'private-dining': 'people-outline', 'family': 'people-outline',
  cards: 'card-outline', 'card-payment': 'card-outline', 'home-delivery': 'bicycle-outline',
  delivery: 'bicycle-outline', parking_valet: 'car-outline', tv: 'tv-outline', 'sports-screening': 'tv-outline',
};

const PERIODS = ['Breakfast', 'Lunch', 'Evening', 'Dinner'];
const slotToHour = (slot = '') => {
  const [t, mer] = slot.split(' ');
  let h = parseInt((t || '0').split(':')[0], 10) || 0;
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return h;
};
const periodOf = (slot) => {
  const h = slotToHour(slot);
  if (h < 12) return 'Breakfast';
  if (h < 16) return 'Lunch';
  if (h < 19) return 'Evening';
  return 'Dinner';
};

const next14Days = () => {
  const out = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    out.push({
      iso: d.toISOString().split('T')[0],
      dow: DAY_LABEL[DAYS[d.getDay()]],
      num: d.getDate(),
      mon: MONTHS[d.getMonth()],
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : null,
    });
  }
  return out;
};

const offerLabel = offerValueLabel;
const offerFunder = offerFunderLabel;

const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
const prettyAmenity = (a = '') => a.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const formatReviewDate = (d) => {
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return ''; }
};

export default function RestaurantDetailScreen({ navigation, route }) {
  const { id, restaurantId, mode: modeParam } = route.params || {};
  const rid = restaurantId || id;
  const diningMode = useAppStore((s) => s.diningMode);
  const setDiningMode = useAppStore((s) => s.setDiningMode);
  // 'book' → reservation section, 'dinein' → walk-in pay bill section.
  const [mode, setMode] = useState(modeParam || (diningMode === 'dinein' ? 'dinein' : 'book'));
  const pickMode = (m) => { setMode(m); setDiningMode(m); };
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const heroRef = useRef(null);

  const [saved, setSaved] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);
  const [reviewsExpanded, setReviewsExpanded] = useState(false);

  const dates = useMemo(next14Days, []);
  const [bookDate, setBookDate] = useState(dates[0].iso);
  const [bookTime, setBookTime] = useState('');
  const [bookGuests, setBookGuests] = useState(2);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['restaurant', rid],
    queryFn: () => restaurantApi.getById(rid).then((r) => r.data.data),
    enabled: !!rid,
    retry: 1,
  });
  const restaurant = data?.restaurant || {};
  const notFound = !isLoading && (isError || (data && !restaurant._id));

  const { data: menuData } = useQuery({
    queryKey: ['restaurant-menu', rid],
    queryFn: () => restaurantApi.getMenu(rid).then((r) => r.data.data),
    enabled: !!rid,
  });
  const { data: reviewsData } = useQuery({
    queryKey: ['restaurant-reviews', rid],
    queryFn: () => restaurantApi.getReviews(rid).then((r) => r.data.data),
    enabled: !!rid,
  });
  const { data: offersData } = useQuery({
    queryKey: ['restaurant-offers', rid],
    queryFn: () => restaurantApi.getOffers(rid).then((r) => r.data.data.offers),
    enabled: !!rid,
  });
  const { data: availability } = useQuery({
    queryKey: ['availability', rid, bookDate, bookGuests],
    queryFn: () => restaurantApi.getAvailability(rid, undefined, bookDate, bookGuests).then((r) => r.data.data),
    enabled: !!rid && !!bookDate,
  });

  const allOffers = offersData || [];
  const bookingOffers = useMemo(() => allOffers.filter(isBookingOffer), [allOffers]);
  const payBillOffers = useMemo(() => allOffers.filter(isPayBillOffer), [allOffers]);

  const saveMutation = useMutation({
    mutationFn: () => restaurantApi.toggleSave(rid),
    onSuccess: () => {
      setSaved((s) => !s);
      Toast.show({ type: 'success', text1: saved ? 'Removed from saved' : 'Saved to favourites' });
    },
  });

  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [HERO_H - 130, HERO_H - 60], [0, 1], Extrapolation.CLAMP),
  }));
  const heroImgStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-HERO_H, 0], [-HERO_H / 2, 0], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [-HERO_H, 0], [1.6, 1], Extrapolation.CLAMP) },
    ],
  }));

  const images = restaurant.images?.length ? restaurant.images.map((i) => i.url).filter(Boolean) : [FALLBACK_IMG];
  const cuisines = restaurant.cuisine?.join(' · ') || 'Restaurant';
  const locality = [restaurant.address?.street, restaurant.address?.city].filter(Boolean).join(', ');
  const open = restaurant._id ? isOpenNow(restaurant) : true;
  const rating = restaurant.averageRating || 0;

  const todayHours = restaurant.operatingHours?.find((h) => h.day === DAYS[new Date().getDay()]);
  const closesAt = todayHours?.isOpen ? todayHours.slots?.[todayHours.slots.length - 1]?.close : null;

  const award = restaurant.isFeatured
    ? { label: 'Featured on Hungora', sub: 'Editor’s pick this month' }
    : rating >= 4.5
      ? { label: 'Top Rated', sub: `Rated ${rating.toFixed(1)} by ${restaurant.totalReviews || 0} diners` }
      : null;

  const stats = reviewsData?.stats || {};
  const reviews = reviewsData?.reviews || [];
  const menuCategories = menuData?.categories || menuData?.menu?.categories || [];
  const menuItems = menuCategories.flatMap((c) => c.items || []);

  const photoStrip = useMemo(() => {
    const a = (restaurant.images || []).map((i) => i.url).filter(Boolean);
    const b = reviews.flatMap((r) => (r.images || []).map((i) => i.url)).filter(Boolean);
    return [...a, ...b].slice(0, 12);
  }, [restaurant.images, reviews]);

  const slots = availability?.availableSlots || [];
  const bookedSlots = availability?.bookedSlots || [];
  const slotsByPeriod = useMemo(() => {
    const map = {};
    slots.forEach((s) => { (map[periodOf(s)] = map[periodOf(s)] || []).push(s); });
    return map;
  }, [slots]);

  const share = () => Share.share({ message: `Check out ${restaurant?.name || 'this place'} on Hungora!` });
  const call = () => {
    const p = restaurant.contact?.phone;
    if (p) Linking.openURL(`tel:${p}`);
    else Toast.show({ type: 'info', text1: 'Phone number not available' });
  };
  const directions = () => {
    const [lng, lat] = restaurant.location?.coordinates || [];
    const q = lat && lng ? `${lat},${lng}` : encodeURIComponent([restaurant.name, locality].filter(Boolean).join(' '));
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  const restaurantMeta = {
    _id: rid,
    name: restaurant.name,
    image: images[0],
    address: restaurant.address,
    contact: restaurant.contact,
    location: restaurant.location,
    cuisine: restaurant.cuisine,
    averageRating: restaurant.averageRating,
    totalReviews: restaurant.totalReviews,
    costForTwo: restaurant.costForTwo,
    cancellationPolicy: restaurant.bookingSettings?.cancellationPolicy,
    depositRequired: restaurant.bookingSettings?.depositRequired,
    depositAmount: restaurant.bookingSettings?.depositAmount,
  };

  // Reserve → straight to Confirm (the old standalone date/time "reserve" screen
  // is gone — date, time and guests are chosen right here).
  const goBook = () => {
    if (!bookTime) return Toast.show({ type: 'error', text1: 'Pick a time slot first' });
    navigation.navigate('BookingConfirm', {
      restaurantId: rid,
      restaurantName: restaurant.name,
      restaurant: restaurantMeta,
      offers: bookingOffers,
      date: bookDate,
      time: bookTime,
      guests: bookGuests,
      requiresDeposit: restaurant.bookingSettings?.depositRequired,
      depositAmount: restaurant.bookingSettings?.depositAmount || 0,
    });
  };

  const selectedDate = dates.find((d) => d.iso === bookDate);

  if (notFound) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.floating, { top: insets.top + 6 }]}>
          <IconButton icon="chevron-back" variant="surface" onPress={() => navigation.goBack()} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="storefront-outline"
            title="Restaurant unavailable"
            message="This place couldn’t be loaded. It may have been removed or the link is out of date."
            actionLabel="Try again"
            onAction={refetch}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Collapsed bar */}
      <Animated.View style={[styles.topBar, { paddingTop: insets.top + 6, height: insets.top + 52 }, barStyle]}>
        <Text style={[text.h3, styles.topBarTitle]} numberOfLines={1}>{restaurant.name}</Text>
      </Animated.View>

      {/* Floating controls */}
      <View style={[styles.floating, { top: insets.top + 6 }]}>
        <IconButton icon="chevron-back" variant="glass" onPress={() => navigation.goBack()} />
        <View style={styles.floatRight}>
          <IconButton icon="share-social-outline" variant="glass" size={19} onPress={share} />
          <IconButton
            icon={saved ? 'heart' : 'heart-outline'}
            variant="glass"
            size={19}
            color={saved ? COLOR.terracotta : '#FFFFFF'}
            onPress={() => saveMutation.mutate()}
          />
        </View>
      </View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}
      >
        {/* Hero carousel */}
        <View style={styles.hero}>
          <Animated.View style={heroImgStyle}>
            <ScrollView
              ref={heroRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setHeroIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
            >
              {images.map((uri, i) => (
                <PhotoImage key={i} uri={uri} style={styles.heroImg} scrim scrimHeight="45%" />
              ))}
            </ScrollView>
          </Animated.View>
          {images.length > 1 ? (
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === heroIdx && styles.dotOn]} />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.sheet}>
          {award ? (
            <View style={styles.awardChip}>
              <Ionicons name="trophy" size={15} color={COLOR.gold} />
              <View style={styles.flex}>
                <Text style={styles.awardLabel}>{award.label}</Text>
                <Text style={styles.awardSub}>{award.sub}</Text>
              </View>
            </View>
          ) : <View style={styles.grabber} />}

          {/* Title block */}
          <View style={styles.headRow}>
            <Text style={[text.h1, styles.name]}>{restaurant.name || ' '}</Text>
            {restaurant.isVerified ? (
              <Ionicons name="checkmark-circle" size={18} color={COLOR.info} />
            ) : null}
          </View>
          <Text style={[text.body, styles.cuisine]}>{cuisines}</Text>
          {locality ? <Text style={[text.caption, styles.locality]}>{locality}</Text> : null}

          <View style={styles.metaRow}>
            {rating > 0 ? (
              <View style={styles.ratingChip}>
                <Ionicons name="star" size={12} color="#FFFFFF" />
                <Text style={styles.ratingChipText}>{rating.toFixed(1)}</Text>
                <Text style={styles.ratingChipCount}>({restaurant.totalReviews || 0})</Text>
              </View>
            ) : <Tag label="New" tone="wine" />}
            <View style={styles.dotSep} />
            <Text style={styles.metaText}>{`₹${restaurant.costForTwo || 800} for two`}</Text>
            <View style={styles.dotSep} />
            <Text style={[styles.metaText, { color: open ? COLOR.success : COLOR.error }]}>
              {open ? (closesAt ? `Open · till ${closesAt}` : 'Open now') : 'Closed now'}
            </Text>
          </View>

          {/* Quick actions */}
          <View style={styles.actionBar}>
            <ActionBtn icon="navigate-outline" label="Directions" onPress={directions} />
            <ActionBtn icon="call-outline" label="Call" onPress={call} />
            <ActionBtn
              icon="restaurant-outline"
              label="Menu"
              onPress={() => navigation.navigate('MenuDetail', { restaurantId: rid, restaurantName: restaurant.name })}
            />
            <ActionBtn
              icon={saved ? 'bookmark' : 'bookmark-outline'}
              label={saved ? 'Saved' : 'Save'}
              onPress={() => saveMutation.mutate()}
            />
          </View>
        </View>

        {/* Book a Table / Dine In switch — shows only the chosen flow */}
        <View style={styles.modeTabs}>
          {[
            { id: 'book', label: 'Book a Table', icon: 'calendar-outline' },
            { id: 'dinein', label: 'Dine In', icon: 'restaurant-outline' },
          ].map((t) => {
            const on = mode === t.id;
            return (
              <Pressable key={t.id} style={[styles.modeTab, on && styles.modeTabOn]} onPress={() => pickMode(t.id)}>
                <Ionicons name={t.icon} size={16} color={on ? '#FFFFFF' : COLOR.navy} />
                <Text style={[styles.modeTabText, on && styles.modeTabTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Book a Table */}
        {mode === 'book' ? (
        <View style={styles.block}>
          <Text style={[text.h2, styles.blockTitle]}>Book a Table</Text>
          <Text style={[text.caption, styles.blockSub]}>Free · instant confirmation · earn Hungora rewards</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
            {dates.map((d) => {
              const on = d.iso === bookDate;
              return (
                <Pressable
                  key={d.iso}
                  onPress={() => { setBookDate(d.iso); setBookTime(''); }}
                  style={[styles.dateCell, on && styles.dateCellOn]}
                >
                  <Text style={[styles.dateDow, on && styles.dateOnText]}>{d.label || d.dow}</Text>
                  <Text style={[styles.dateNum, on && styles.dateOnText]}>{d.num}</Text>
                  <Text style={[styles.dateMon, on && styles.dateOnText]}>{d.mon}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.guestRow}>
            <Text style={styles.guestLabel}>Guests</Text>
            <View style={styles.stepper}>
              <Pressable onPress={() => { setBookGuests((g) => Math.max(1, g - 1)); setBookTime(''); }} style={styles.stepBtn}>
                <Ionicons name="remove" size={18} color={COLOR.navy} />
              </Pressable>
              <Text style={styles.stepVal}>{bookGuests}</Text>
              <Pressable onPress={() => { setBookGuests((g) => Math.min(20, g + 1)); setBookTime(''); }} style={styles.stepBtn}>
                <Ionicons name="add" size={18} color={COLOR.navy} />
              </Pressable>
            </View>
          </View>

          {PERIODS.filter((p) => slotsByPeriod[p]?.length).map((p) => (
            <View key={p} style={styles.periodBlock}>
              <Text style={styles.periodLabel}>{p}</Text>
              <View style={styles.slotWrap}>
                {slotsByPeriod[p].map((s) => {
                  const on = s === bookTime;
                  const taken = bookedSlots.includes(s);
                  return (
                    <Pressable
                      key={s}
                      disabled={taken}
                      onPress={() => setBookTime(s)}
                      style={[styles.slot, on && styles.slotOn, taken && styles.slotOff]}
                    >
                      <Text style={[styles.slotText, on && styles.slotOnText, taken && styles.slotOffText]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {bookingOffers[0] ? (
            <View style={styles.dealInline}>
              <Ionicons name="pricetag" size={14} color={COLOR.gold} />
              <Text style={styles.dealInlineText} numberOfLines={1}>
                {offerLabel(bookingOffers[0])} on this booking
              </Text>
            </View>
          ) : null}

          <Button
            label={bookTime ? `Reserve for ${selectedDate?.label || `${selectedDate?.dow} ${selectedDate?.num}`}, ${bookTime}` : 'Select a time to continue'}
            onPress={goBook}
            disabled={!bookTime}
            iconRight="arrow-forward"
            style={{ marginTop: SPACING.md }}
          />
        </View>
        ) : null}

        {/* Walk-in Pay Bill — available at every restaurant */}
        {mode === 'dinein' && restaurant._id ? (
          <View style={styles.block}>
            <WalkInPayBill
              offers={payBillOffers}
              onProceed={(amount, offerId) => navigation.navigate('PayBill', {
                restaurant: {
                  _id: rid, name: restaurant.name, address: restaurant.address,
                  logo: restaurant.logo, averageRating: restaurant.averageRating,
                },
                billAmount: amount,
                offerId,
              })}
            />
          </View>
        ) : null}

        {/* Deals */}
        {allOffers.length ? (
          <View style={styles.block}>
            <Text style={[text.h2, styles.blockTitle]}>Deals & Offers</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm, paddingTop: SPACING.sm }}>
              {allOffers.map((o) => (
                <View key={o._id} style={styles.dealCard}>
                  <View style={styles.dealTop}>
                    <Ionicons name="pricetag" size={16} color={COLOR.gold} />
                    <Text style={styles.dealKind}>{offerFunder(o)}</Text>
                  </View>
                  <Text style={styles.dealValue}>{offerLabel(o)}</Text>
                  <Text style={styles.dealTitle} numberOfLines={2}>{o.title}</Text>
                  {o.minOrderAmount > 0 ? (
                    <Text style={styles.dealMin}>Min bill ₹{o.minOrderAmount}</Text>
                  ) : null}
                  {o.code ? (
                    <View style={styles.dealCode}><Text style={styles.dealCodeText}>{o.code}</Text></View>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* About */}
        {(restaurant.description || restaurant.tags?.length) ? (
          <View style={styles.block}>
            <Text style={[text.h2, styles.blockTitle]}>About</Text>
            {restaurant.description ? (
              <Text style={[text.body, styles.about]}>{restaurant.description}</Text>
            ) : null}
            {restaurant.tags?.length ? (
              <>
                <Text style={styles.knownForLabel}>Known for</Text>
                <View style={styles.tagWrap}>
                  {restaurant.tags.slice(0, 8).map((t) => <Tag key={t} label={prettyAmenity(t)} tone="gold" />)}
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {/* Menu preview */}
        {menuItems.length ? (
          <View style={styles.block}>
            <View style={styles.blockHeadRow}>
              <Text style={[text.h2, styles.blockTitle]}>Menu</Text>
              <Pressable
                hitSlop={8}
                style={styles.seeAll}
                onPress={() => navigation.navigate('MenuDetail', { restaurantId: rid, restaurantName: restaurant.name })}
              >
                <Text style={text.link}>Full menu</Text>
                <Ionicons name="chevron-forward" size={14} color={COLOR.terracotta} />
              </Pressable>
            </View>
            {menuItems.slice(0, 5).map((item, i) => (
              <View key={item._id || item.name || i} style={styles.menuItem}>
                <View style={[styles.vegDot, { borderColor: item.isVeg ? COLOR.success : COLOR.error }]}>
                  <View style={[styles.vegInner, { backgroundColor: item.isVeg ? COLOR.success : COLOR.error }]} />
                </View>
                <View style={styles.flex}>
                  <Text style={text.bodyStrong}>{item.name}</Text>
                  {item.description ? (
                    <Text style={[text.caption, styles.menuDesc]} numberOfLines={2}>{item.description}</Text>
                  ) : null}
                </View>
                <Text style={styles.menuPrice}>₹{item.price}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Photos */}
        {photoStrip.length ? (
          <View style={styles.block}>
            <Text style={[text.h2, styles.blockTitle]}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.xs, paddingTop: SPACING.sm }}>
              {photoStrip.map((uri, i) => (
                <PhotoImage key={i} uri={uri} style={styles.photo} radius={RADII.md} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Reviews */}
        <View style={styles.block}>
          <Text style={[text.h2, styles.blockTitle]}>Ratings & Reviews</Text>
          {stats.totalReviews > 0 ? (
            <>
              <View style={styles.scoreRow}>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreBig}>{(stats.averageRating || 0).toFixed(1)}</Text>
                  <View style={styles.starLine}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons
                        key={n}
                        name={n <= Math.round(stats.averageRating) ? 'star' : 'star-outline'}
                        size={12}
                        color={COLOR.gold}
                      />
                    ))}
                  </View>
                  <Text style={styles.scoreCount}>{stats.totalReviews} reviews</Text>
                </View>
                <View style={styles.flex}>
                  {[5, 4, 3, 2, 1].map((n) => {
                    const c = stats.ratingBreakdown?.[n] || 0;
                    const pct = stats.totalReviews ? (c / stats.totalReviews) * 100 : 0;
                    return (
                      <View key={n} style={styles.barRow}>
                        <Text style={styles.barNum}>{n}</Text>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${pct}%` }]} />
                        </View>
                        <Text style={styles.barCount}>{c}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {(stats.avgFood || stats.avgService || stats.avgAmbiance) ? (
                <View style={styles.subScoreRow}>
                  {[['Food', stats.avgFood], ['Service', stats.avgService], ['Ambience', stats.avgAmbiance]]
                    .filter(([, v]) => v > 0)
                    .map(([k, v]) => (
                      <View key={k} style={styles.subScore}>
                        <Text style={styles.subScoreVal}>{v.toFixed(1)}</Text>
                        <Text style={styles.subScoreKey}>{k}</Text>
                      </View>
                    ))}
                </View>
              ) : null}

              {(reviewsExpanded ? reviews : reviews.slice(0, 3)).map((r, i) => (
                <View key={r._id || i} style={styles.reviewCard}>
                  <View style={styles.reviewHead}>
                    <Avatar name={r.customer?.name} uri={r.customer?.avatar?.url} size={36} />
                    <View style={styles.flex}>
                      <Text style={text.bodyStrong}>{r.customer?.name || 'Diner'}</Text>
                      <Text style={text.caption}>{formatReviewDate(r.createdAt)}</Text>
                    </View>
                    <View style={styles.reviewStar}>
                      <Ionicons name="star" size={11} color="#FFFFFF" />
                      <Text style={styles.reviewStarText}>{r.rating?.toFixed(1)}</Text>
                    </View>
                  </View>
                  {r.title ? <Text style={styles.reviewTitle}>{r.title}</Text> : null}
                  {r.comment ? <Text style={[text.body, styles.reviewBody]}>{r.comment}</Text> : null}
                  {r.images?.length ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 8 }}>
                      {r.images.map((im, k) => (
                        <PhotoImage key={k} uri={im.url} style={styles.reviewImg} radius={RADII.sm} />
                      ))}
                    </ScrollView>
                  ) : null}
                  {r.ownerReply?.text ? (
                    <View style={styles.ownerReply}>
                      <Text style={styles.ownerReplyLabel}>Response from {restaurant.name}</Text>
                      <Text style={[text.caption, styles.ownerReplyText]}>{r.ownerReply.text}</Text>
                    </View>
                  ) : null}
                </View>
              ))}

              {reviews.length > 3 ? (
                <Pressable style={styles.expandBtn} onPress={() => setReviewsExpanded((s) => !s)}>
                  <Text style={text.link}>{reviewsExpanded ? 'Show less' : `Read all ${reviews.length} reviews`}</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <EmptyState icon="chatbubble-ellipses-outline" title="No reviews yet" message="Be the first to dine and review." />
          )}
        </View>

        {/* Amenities */}
        {restaurant.amenities?.length ? (
          <View style={styles.block}>
            <Text style={[text.h2, styles.blockTitle]}>Features & Amenities</Text>
            <View style={styles.amenityGrid}>
              {restaurant.amenities.map((a) => (
                <View key={a} style={styles.amenity}>
                  <View style={styles.amenityIcon}>
                    <Ionicons
                      name={AMENITY_ICONS[a?.toLowerCase()] || 'checkmark-circle-outline'}
                      size={16}
                      color={COLOR.navy}
                    />
                  </View>
                  <Text style={styles.amenityText}>{prettyAmenity(a)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Location & timings */}
        <View style={styles.block}>
          <Text style={[text.h2, styles.blockTitle]}>Location & Timings</Text>
          <Text style={[text.body, styles.addressText]}>
            {[restaurant.address?.street, restaurant.address?.city, restaurant.address?.state, restaurant.address?.pincode]
              .filter(Boolean).join(', ') || 'Address unavailable'}
          </Text>
          <View style={styles.locBtns}>
            <Button label="Get Directions" variant="secondary" size="md" icon="navigate-outline" full={false} onPress={directions} />
            <Button label="Call" variant="secondary" size="md" icon="call-outline" full={false} onPress={call} />
          </View>

          {restaurant.operatingHours?.length ? (
            <View style={styles.hoursTable}>
              {DAYS.map((d) => {
                const h = restaurant.operatingHours.find((x) => x.day === d);
                const isToday = d === DAYS[new Date().getDay()];
                return (
                  <View key={d} style={styles.hourRow}>
                    <Text style={[styles.hourDay, isToday && styles.hourToday]}>{cap(d)}</Text>
                    <Text style={[styles.hourVal, isToday && styles.hourToday, !h?.isOpen && { color: COLOR.error }]}>
                      {h?.isOpen ? (h.slots || []).map((s) => `${s.open}–${s.close}`).join(', ') || 'Open' : 'Closed'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={styles.policyRow}>
            <Ionicons name="shield-checkmark-outline" size={15} color={COLOR.inkSoft} />
            <Text style={[text.caption, styles.policyText]}>
              {restaurant.bookingSettings?.cancellationPolicy || 'Free cancellation up to 2 hours before your reservation.'}
            </Text>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Sticky CTA — booking only; Dine In has its own Pay button inline */}
      {mode === 'book' ? (
      <View style={[styles.cta, { paddingBottom: insets.bottom + SPACING.sm }]}>
        <View style={styles.flex}>
          {bookTime ? (
            <>
              <Text style={text.bodyStrong}>{selectedDate?.label || `${selectedDate?.dow} ${selectedDate?.num} ${selectedDate?.mon}`} · {bookTime}</Text>
              <Text style={text.caption}>{bookGuests} {bookGuests > 1 ? 'guests' : 'guest'} · tap to confirm</Text>
            </>
          ) : (
            <>
              <Text style={text.bodyStrong}>Reserve a table</Text>
              <Text style={text.caption}>Pick a date & time above</Text>
            </>
          )}
        </View>
        <Button label={bookTime ? 'Reserve' : 'Book a table'} full={false} onPress={goBook} disabled={!bookTime} />
      </View>
      ) : null}
    </View>
  );
}

function ActionBtn({ icon, label, onPress }) {
  return (
    <Pressable style={styles.actionBtn} onPress={onPress}>
      <View style={styles.actionIcon}><Ionicons name={icon} size={18} color={COLOR.navy} /></View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function CountRupee({ value, style }) {
  const av = useRef(new RNAnimated.Value(value || 0)).current;
  const [shown, setShown] = useState(Math.round(value || 0));
  useEffect(() => {
    const id = av.addListener(({ value: v }) => setShown(Math.round(v)));
    RNAnimated.timing(av, { toValue: value || 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => av.removeListener(id);
  }, [value]);
  return <Text style={style}>₹{shown.toLocaleString('en-IN')}</Text>;
}

function WalkInPayBill({ offers, onProceed }) {
  const [amount, setAmount] = useState('');
  const reveal = useRef(new RNAnimated.Value(0)).current;

  const amt = parseFloat(amount) || 0;
  const best = bestOffer(offers, amt);
  const offer = best?.offer || null;
  const discount = best?.discount || 0;
  const net = Math.max(0, amt - discount);

  useEffect(() => {
    RNAnimated.timing(reveal, {
      toValue: amt > 0 ? 1 : 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [amt > 0]);

  const nextMin = offers
    .filter((o) => (o.minOrderAmount || 0) > amt)
    .map((o) => o.minOrderAmount - amt)
    .sort((a, b) => a - b)[0];

  return (
    <View style={styles.walkIn}>
      <Text style={[text.h3, styles.walkInTitle]}>Dining in? Pay your bill</Text>
      <Text style={[text.caption, styles.walkInSub]}>Enter your bill and see your discount instantly.</Text>

      <View style={styles.billInputWrap}>
        <Text style={styles.billRupee}>₹</Text>
        <TextInput
          style={styles.billInput}
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={COLOR.inkFaint}
          maxLength={7}
        />
      </View>

      {amt > 0 ? (
        <RNAnimated.View
          style={[
            styles.wRevealed,
            { opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
          ]}
        >
          {discount > 0 ? (
            <>
              <View style={styles.wOfferRow}>
                <Ionicons name="pricetag" size={12} color={COLOR.gold} />
                <Text style={styles.wOfferText}>{offerFunder(offer)} · {offerLabel(offer)}</Text>
              </View>
              <View style={styles.wPayRow}>
                <CountRupee value={net} style={styles.wPay} />
                <Text style={styles.wStrike}>₹{amt.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.wSavePill}>
                <Ionicons name="sparkles" size={12} color="#9A6E1C" />
                <Text style={styles.wSaveText}>You save </Text>
                <CountRupee value={discount} style={styles.wSaveAmt} />
              </View>
            </>
          ) : (
            <Text style={styles.wHint}>
              {nextMin ? `Add ₹${Math.round(nextMin)} more to unlock an offer` : 'No offer for this amount — you still earn coins'}
            </Text>
          )}
        </RNAnimated.View>
      ) : null}

      <Pressable
        style={[styles.payPill, amt <= 0 && styles.payPillOff]}
        onPress={() => amt > 0 && onProceed(amt, offer?._id)}
        disabled={amt <= 0}
      >
        <Text style={styles.payPillText}>
          {amt > 0 ? 'Proceed to Pay' : 'Enter bill amount'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.bg },
  hero: { height: HERO_H, width, overflow: 'hidden' },
  heroImg: { width, height: HERO_H },
  dots: { position: 'absolute', bottom: 40, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotOn: { backgroundColor: '#FFFFFF', width: 18 },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
    backgroundColor: COLOR.bg, justifyContent: 'flex-end', paddingBottom: 10, paddingHorizontal: 56,
    borderBottomWidth: 1, borderBottomColor: COLOR.hairline,
  },
  topBarTitle: { textAlign: 'center' },
  floating: {
    position: 'absolute', left: SPACING.md, right: SPACING.md, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  floatRight: { flexDirection: 'row', gap: SPACING.xs },

  sheet: {
    backgroundColor: COLOR.bg, borderTopLeftRadius: RADII.xl, borderTopRightRadius: RADII.xl,
    marginTop: -24, paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLOR.border, marginBottom: SPACING.md },
  awardChip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, alignSelf: 'flex-start',
    marginTop: SPACING.xs, marginBottom: SPACING.sm, backgroundColor: COLOR.navy,
    borderRadius: RADII.pill, paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: COLOR.gold, ...ELEVATION.md,
  },
  awardLabel: { fontFamily: FONT.bold, fontSize: 12, color: COLOR.gold, letterSpacing: 0.3 },
  awardSub: { fontFamily: FONT.regular, fontSize: 10, color: COLOR.onNavySoft, marginTop: 1 },

  headRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1 },
  cuisine: { marginTop: 4 },
  locality: { marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: SPACING.sm, flexWrap: 'wrap' },
  ratingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLOR.success,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
  },
  ratingChipText: { fontFamily: FONT.bold, fontSize: 12, color: '#FFFFFF' },
  ratingChipCount: { fontFamily: FONT.regular, fontSize: 10, color: 'rgba(255,255,255,0.85)' },
  metaText: { fontFamily: FONT.medium, fontSize: 13, color: COLOR.inkSoft },
  dotSep: { width: 3, height: 3, borderRadius: 2, backgroundColor: COLOR.inkFaint },

  actionBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: SPACING.md, paddingTop: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLOR.hairline,
  },
  actionBtn: { alignItems: 'center', gap: 5, flex: 1 },
  actionIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: COLOR.surface,
    alignItems: 'center', justifyContent: 'center', ...ELEVATION.sm,
  },
  actionLabel: { fontFamily: FONT.medium, fontSize: 11, color: COLOR.inkSoft },

  modeTabs: {
    flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm,
    marginHorizontal: SPACING.lg, padding: 4,
    backgroundColor: COLOR.surface, borderRadius: RADII.pill, ...ELEVATION.sm,
  },
  modeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: RADII.pill,
  },
  modeTabOn: { backgroundColor: COLOR.navy },
  modeTabText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLOR.navy },
  modeTabTextOn: { color: '#FFFFFF' },

  block: {
    backgroundColor: COLOR.surface, marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg,
  },
  blockHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blockTitle: {},
  blockSub: { marginTop: 4 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  flex: { flex: 1 },

  dateRow: { gap: SPACING.xs, paddingVertical: SPACING.md },
  dateCell: {
    width: 58, alignItems: 'center', paddingVertical: 8, borderRadius: RADII.md,
    borderWidth: 1, borderColor: COLOR.border, backgroundColor: COLOR.surface,
  },
  dateCellOn: { backgroundColor: COLOR.navy, borderColor: COLOR.navy },
  dateDow: { fontFamily: FONT.medium, fontSize: 10, color: COLOR.inkSoft },
  dateNum: { fontFamily: FONT.bold, fontSize: 17, color: COLOR.ink, marginVertical: 1 },
  dateMon: { fontFamily: FONT.regular, fontSize: 10, color: COLOR.inkSoft },
  dateOnText: { color: '#FFFFFF' },

  guestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  guestLabel: { fontFamily: FONT.semiBold, fontSize: 14, color: COLOR.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  stepBtn: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: COLOR.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLOR.surface,
  },
  stepVal: { fontFamily: FONT.bold, fontSize: 16, color: COLOR.ink, minWidth: 22, textAlign: 'center' },

  periodBlock: { marginTop: SPACING.sm },
  periodLabel: { fontFamily: FONT.semiBold, fontSize: 11, color: COLOR.inkFaint, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: SPACING.xs },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  slot: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADII.sm,
    borderWidth: 1, borderColor: COLOR.border, backgroundColor: COLOR.surface,
  },
  slotOn: { backgroundColor: COLOR.terracottaTint, borderColor: COLOR.terracotta },
  slotOff: { opacity: 0.4 },
  slotText: { fontFamily: FONT.medium, fontSize: 13, color: COLOR.ink },
  slotOnText: { color: COLOR.terracottaPressed, fontFamily: FONT.bold },
  slotOffText: { textDecorationLine: 'line-through' },

  dealInline: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.md,
    backgroundColor: COLOR.goldTint, borderRadius: RADII.sm, paddingVertical: 8, paddingHorizontal: 12,
  },
  dealInlineText: { fontFamily: FONT.semiBold, fontSize: 12, color: COLOR.navy, flex: 1 },

  dealCard: {
    width: 190, borderRadius: RADII.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLOR.gold, backgroundColor: COLOR.goldTint,
  },
  dealTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dealKind: { fontFamily: FONT.semiBold, fontSize: 10, color: COLOR.wine, letterSpacing: 0.3, textTransform: 'uppercase' },
  dealValue: { fontFamily: FONT.bold, fontSize: 16, color: COLOR.navy, marginTop: 6 },
  dealTitle: { fontFamily: FONT.regular, fontSize: 12, color: COLOR.inkSoft, marginTop: 3 },
  dealMin: { fontFamily: FONT.regular, fontSize: 11, color: COLOR.inkFaint, marginTop: 4 },
  dealCode: {
    alignSelf: 'flex-start', marginTop: 8, borderWidth: 1, borderColor: COLOR.terracotta,
    borderStyle: 'dashed', borderRadius: RADII.xs, paddingHorizontal: 8, paddingVertical: 2,
  },
  dealCodeText: { fontFamily: FONT.bold, fontSize: 11, color: COLOR.terracotta, letterSpacing: 0.5 },

  walkIn: {
    backgroundColor: COLOR.surface, borderRadius: RADII.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLOR.goldTint,
  },
  walkInTitle: { marginBottom: 2 },
  walkInSub: { marginBottom: SPACING.md },
  billInputWrap: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    borderBottomWidth: 2, borderBottomColor: COLOR.gold, paddingHorizontal: SPACING.sm,
  },
  billRupee: { fontFamily: FONT.bold, fontSize: 22, color: COLOR.navy, marginRight: 4 },
  billInput: {
    fontFamily: FONT.bold, fontSize: 34, color: COLOR.navy, textAlign: 'center',
    minWidth: 90, paddingVertical: 6, padding: 0,
  },
  wRevealed: {
    marginTop: SPACING.md, backgroundColor: COLOR.goldTint, borderRadius: RADII.md,
    borderWidth: 1, borderColor: '#EAD4A3', padding: SPACING.md, alignItems: 'center',
  },
  wOfferRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  wOfferText: { fontFamily: FONT.bold, fontSize: 11, color: COLOR.navy },
  wPayRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  wPay: { fontFamily: FONT.bold, fontSize: 26, color: COLOR.navy },
  wStrike: { fontFamily: FONT.medium, fontSize: 13, color: '#9A6E1C', textDecorationLine: 'line-through' },
  wSavePill: {
    flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6,
    backgroundColor: '#FFFFFF', borderRadius: RADII.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  wSaveText: { fontFamily: FONT.medium, fontSize: 11, color: COLOR.navy },
  wSaveAmt: { fontFamily: FONT.bold, fontSize: 12, color: '#9A6E1C' },
  wHint: { fontFamily: FONT.regular, fontSize: 12, color: COLOR.inkSoft, textAlign: 'center' },
  payPill: {
    backgroundColor: COLOR.gold, borderRadius: RADII.pill, paddingVertical: 14,
    alignItems: 'center', marginTop: SPACING.md,
  },
  payPillOff: { opacity: 0.45 },
  payPillText: { fontFamily: FONT.bold, fontSize: 14, color: COLOR.navy, letterSpacing: 0.3 },

  about: { marginTop: SPACING.sm, lineHeight: 22 },
  knownForLabel: { fontFamily: FONT.semiBold, fontSize: 12, color: COLOR.inkSoft, marginTop: SPACING.md, marginBottom: SPACING.xs },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },

  menuItem: {
    flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start',
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLOR.hairline,
  },
  vegDot: { width: 15, height: 15, borderRadius: 3, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  vegInner: { width: 7, height: 7, borderRadius: 4 },
  menuDesc: { marginTop: 2 },
  menuPrice: { fontFamily: FONT.semiBold, fontSize: 13, color: COLOR.ink },

  photo: { width: 130, height: 96 },

  scoreRow: { flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.md, alignItems: 'center' },
  scoreBox: { alignItems: 'center', paddingRight: SPACING.lg, borderRightWidth: 1, borderRightColor: COLOR.hairline },
  scoreBig: { fontFamily: FONT.displayBold, fontSize: 34, color: COLOR.ink, lineHeight: 38 },
  starLine: { flexDirection: 'row', gap: 1, marginTop: 2 },
  scoreCount: { fontFamily: FONT.regular, fontSize: 11, color: COLOR.inkSoft, marginTop: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 },
  barNum: { fontFamily: FONT.medium, fontSize: 10, color: COLOR.inkSoft, width: 8 },
  barTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: COLOR.sunken, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3, backgroundColor: COLOR.gold },
  barCount: { fontFamily: FONT.regular, fontSize: 10, color: COLOR.inkFaint, width: 18, textAlign: 'right' },

  subScoreRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  subScore: {
    flex: 1, alignItems: 'center', backgroundColor: COLOR.bg, borderRadius: RADII.md, paddingVertical: SPACING.sm,
  },
  subScoreVal: { fontFamily: FONT.bold, fontSize: 15, color: COLOR.navy },
  subScoreKey: { fontFamily: FONT.regular, fontSize: 11, color: COLOR.inkSoft, marginTop: 2 },

  reviewCard: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLOR.hairline },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  reviewStar: {
    flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLOR.success,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  reviewStarText: { fontFamily: FONT.bold, fontSize: 11, color: '#FFFFFF' },
  reviewTitle: { fontFamily: FONT.semiBold, fontSize: 13, color: COLOR.ink, marginTop: SPACING.xs },
  reviewBody: { marginTop: 4, lineHeight: 21 },
  reviewImg: { width: 84, height: 84 },
  ownerReply: {
    marginTop: SPACING.sm, backgroundColor: COLOR.bg, borderRadius: RADII.sm, padding: SPACING.sm,
    borderLeftWidth: 3, borderLeftColor: COLOR.gold,
  },
  ownerReplyLabel: { fontFamily: FONT.semiBold, fontSize: 11, color: COLOR.navy },
  ownerReplyText: { marginTop: 3, lineHeight: 17 },
  expandBtn: { alignItems: 'center', paddingTop: SPACING.md },

  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACING.sm },
  amenity: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  amenityIcon: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLOR.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  amenityText: { fontFamily: FONT.regular, fontSize: 12, color: COLOR.inkSoft, flex: 1 },

  addressText: { marginTop: SPACING.sm, lineHeight: 21 },
  locBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  hoursTable: { marginTop: SPACING.lg },
  hourRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLOR.hairline },
  hourDay: { fontFamily: FONT.regular, fontSize: 13, color: COLOR.inkSoft },
  hourVal: { fontFamily: FONT.regular, fontSize: 13, color: COLOR.ink },
  hourToday: { fontFamily: FONT.bold, color: COLOR.navy },
  policyRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.lg, alignItems: 'flex-start' },
  policyText: { flex: 1, lineHeight: 17 },

  cta: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center',
    gap: SPACING.md, backgroundColor: COLOR.surface, paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLOR.hairline, ...ELEVATION.lg,
  },
});
