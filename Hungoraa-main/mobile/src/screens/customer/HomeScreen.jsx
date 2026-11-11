import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, FlatList, RefreshControl,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import Brandmark from '../../components/Brandmark';
import QuickActions from '../../components/home/QuickActions';
import DiscoveryGrid from '../../components/home/DiscoveryGrid';
import BottomNavigation from '../../components/home/BottomNavigation';
import RateOrderCard from '../../components/home/RateOrderCard';
import LocationGate from '../../components/home/LocationGate';
import HomeHeroVideo from '../../components/home/HomeHeroVideo';
import OffersBanner from '../../components/home/OffersBanner';
import { useAppStore } from '../../store/appStore';
import {
  toRestaurantCard, toPromo, offersByRestaurant,
} from '../../components/home/viewModels';
import {
  useActiveOffers, useFeaturedRestaurants, useTrendingRestaurants, useUnreadCount,
  useFavorites, useCities,
} from '../../hooks/useHome';
import { useAuthStore } from '../../store/authStore';
import settingsApi from '../../api/settings.api';
import { COLOR, SPACING, RADII, text, FONT } from '../../theme';
import {
  Avatar, Chip, RestaurantCard, SkeletonCard, EmptyState, Sheet, Divider,
} from '../../components/ui';

const CITY_FALLBACK = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata'];

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const city = useAuthStore((s) => s.city);
  const locality = useAuthStore((s) => s.locality);
  const setCity = useAuthStore((s) => s.setCity);
  const setLocation = useAuthStore((s) => s.setLocation);

  const [category, setCategory] = useState({ id: 'all', label: 'All' });
  const [section, setSection] = useState('top');
  const [showRate, setShowRate] = useState(true);
  const [locOpen, setLocOpen] = useState(false);

  // Post-login location prompt. Not persisted, so it re-evaluates each launch.
  const introDone = useAppStore((s) => s.introDone);
  const setDiningMode = useAppStore((s) => s.setDiningMode);
  const locationPromptDone = useAppStore((s) => s.locationPromptDone);
  const markLocationPrompt = useAppStore((s) => s.markLocationPrompt);
  const [locGateOpen, setLocGateOpen] = useState(false);

  const platformQ = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => settingsApi.getPublic().then((r) => r.data.data.settings),
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
  });
  // Show the admin-set home background whenever a URL is set (unless explicitly
  // switched off).
  const p = platformQ.data;
  const heroOn = !!p && p.homeHeroEnabled !== false;
  const heroImage = heroOn ? (p.homeHeroImageUrl || null) : null;
  const heroVideo = heroOn ? (p.homeHeroVideoUrl || null) : null;

  const offersQ = useActiveOffers(city);
  const featuredQ = useFeaturedRestaurants();
  const trendingQ = useTrendingRestaurants(city, {
    cuisine: category.id === 'all' ? undefined : category.label,
    sortBy: section === 'quick' ? 'relevance' : 'rating',
  });
  const unreadQ = useUnreadCount();
  const citiesQ = useCities();
  const { isFavorite, toggleFavorite } = useFavorites();

  const offerMap = useMemo(() => offersByRestaurant(offersQ.data || []), [offersQ.data]);
  const promos = useMemo(() => (offersQ.data || []).slice(0, 6).map(toPromo), [offersQ.data]);
  const trending = useMemo(
    () => (trendingQ.data || []).map((r) => toRestaurantCard(r, offerMap)),
    [trendingQ.data, offerMap],
  );
  const cuisines = useMemo(() => cuisineList(featuredQ.data, trendingQ.data), [featuredQ.data, trendingQ.data]);

  const go = (screen, params) => navigation?.navigate?.(screen, params);
  const openRestaurant = (r) => go('RestaurantDetail', { restaurantId: r.id, slug: r.slug });

  // Swiggy-style: right after login, figure out where the guest is. If location
  // is already granted, detect silently; otherwise show the permission prompt.
  // Waits for the launch video, so the prompt never pops up over it.
  useEffect(() => {
    if (!introDone) return undefined;
    let cancelled = false;
    (async () => {
      if (city || locationPromptDone) return;
      markLocationPrompt();
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;
        if (perm.status === 'granted') {
          try {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            let dCity = null;
            let dLoc = null;
            try {
              const [p] = await Location.reverseGeocodeAsync(coords);
              if (p) {
                dCity = p.city || p.subregion || p.region || null;
                dLoc = [p.district || p.name, dCity].filter(Boolean).join(', ') || dCity;
              }
            } catch { /* geocode best-effort */ }
            if (!cancelled) setLocation({ city: dCity, coords, locality: dLoc });
          } catch { /* GPS fix failed — leave it, user can pick a city */ }
        } else if (!cancelled) {
          setLocGateOpen(true);
        }
      } catch {
        if (!cancelled) setLocGateOpen(true);
      }
    })();
    return () => { cancelled = true; };
  }, [introDone]);

  const handleLocationResolved = ({ city: c, coords, locality: loc }) => {
    setLocation({ city: c, coords, locality: loc });
    setLocGateOpen(false);
    if (!c) setLocOpen(true); // couldn't geocode — let them pick a city
  };
  const handleLocationManual = () => { setLocGateOpen(false); setLocOpen(true); };

  const handleQuickAction = (id) => {
    setDiningMode(id);
    if (id === 'book') go('RestaurantList', { title: 'Book a table', city, mode: 'book' });
    else go('PayBill');
  };

  const refreshing = Boolean(offersQ.isRefetching || featuredQ.isRefetching || trendingQ.isRefetching);
  const onRefresh = useCallback(() => {
    offersQ.refetch(); featuredQ.refetch(); trendingQ.refetch(); unreadQ.refetch();
  }, [offersQ, featuredQ, trendingQ, unreadQ]);

  const avatarUrl = user?.avatar?.url || user?.profilePhoto || user?.photo || null;
  const cityList = citiesQ.data?.length ? citiesQ.data : CITY_FALLBACK;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" colors={['#FFFFFF']} />
        }
      >
        {/* Navy zone — brand, location and search, ends in a curved shape */}
        <View style={[styles.navyZone, { paddingTop: insets.top + SPACING.xs }]}>
          {/* Admin-set hero background (Swiggy-style) — image or looping video */}
          {heroVideo ? (
            <HomeHeroVideo uri={heroVideo} poster={heroImage} />
          ) : heroImage ? (
            <ExpoImage
              source={{ uri: heroImage }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="top"
              allowDownscaling={false} // keep full-res pixels — Android downscaling softens the hero
              priority="high"
              cachePolicy="memory-disk"
              transition={250}
            />
          ) : null}

          {/* Brand */}
          <Brandmark />

          {/* Top bar */}
          <View style={styles.topBar}>
            <Pressable style={styles.location} onPress={() => setLocOpen(true)}>
              <Ionicons name="location" size={15} color="#F9A91B" />
              <Text style={styles.locText} numberOfLines={1}>{locality || city || 'Set location'}</Text>
              <Ionicons name="chevron-down" size={15} color={COLOR.onNavySoft} />
            </Pressable>
            <View style={styles.topRight}>
              <Pressable hitSlop={8} style={styles.bell} onPress={() => go('Notifications')}>
                <Ionicons name="notifications-outline" size={20} color={COLOR.onNavy} />
                {unreadQ.data > 0 ? <View style={styles.badge} /> : null}
              </Pressable>
              <Pressable onPress={() => go('Profile')} hitSlop={6}>
                <Avatar name={user?.name || 'U'} uri={avatarUrl} size={38} />
              </Pressable>
            </View>
          </View>

          {/* Search (opens Search screen) */}
          <Pressable style={styles.search} onPress={() => go('Search')}>
            <Ionicons name="search" size={18} color={COLOR.inkFaint} />
            <Text style={styles.searchText}>Restaurants, cuisines, a dish…</Text>
            <View style={styles.searchMic}>
              <Ionicons name="mic-outline" size={16} color={COLOR.terracotta} />
            </View>
          </Pressable>
        </View>

        {/* Primary actions — fully below the hero's curve, on the plain page */}
        <QuickActions onPress={handleQuickAction} />

        {/* Cuisine chips — scroll with the page, under the primary actions */}
        {cuisines.length ? (
          <FlatList
            data={cuisines}
            keyExtractor={(c) => c.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            renderItem={({ item }) => (
              <Chip
                label={item.label}
                selected={category.id === item.id}
                onPress={() => setCategory(category.id === item.id ? { id: 'all', label: 'All' } : item)}
              />
            )}
          />
        ) : null}

        {/* What's on your mind — back on white */}
        <Text style={[text.h2, styles.sectionHead]}>What&apos;s on your mind?</Text>
        <DiscoveryGrid onOpen={(params) => go('RestaurantList', { ...params, city })} />

        {/* Top rated / quick */}
        <View style={styles.togRow}>
          <Text style={text.h2}>{section === 'quick' ? 'Table in 15 min' : 'Top rated near you'}</Text>
          <View style={styles.toggle}>
            {[['top', 'Top rated'], ['quick', 'Quick']].map(([id, label]) => (
              <Pressable
                key={id}
                onPress={() => setSection(id)}
                style={[styles.toggleBtn, section === id && styles.toggleBtnOn]}
              >
                <Text style={[styles.toggleText, section === id && styles.toggleTextOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {trendingQ.isLoading ? (
          <View style={styles.railPad}><SkeletonCard style={styles.skelFeature} /></View>
        ) : trending.length ? (
          <FlatList
            data={trending}
            keyExtractor={(r) => r.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
            renderItem={({ item }) => (
              <RestaurantCard
                item={item}
                layout="feature"
                isFavorite={isFavorite(item.id)}
                onToggleFavorite={toggleFavorite}
                onPress={() => openRestaurant(item)}
              />
            )}
          />
        ) : (
          <EmptyState
            icon="restaurant-outline"
            title={city ? `No restaurants in ${city} yet` : 'No restaurants found'}
            message="Try changing your city or filters."
          />
        )}

        {/* Offers — live, auto-sliding (EasyDiner style), below the restaurants */}
        {offersQ.isLoading ? (
          <View style={styles.railPad}><SkeletonCard style={styles.skelBanner} /></View>
        ) : promos.length ? (
          <View style={styles.bannerWrap}>
            <Text style={[text.h2, styles.sectionHead]}>Offers for you</Text>
            <OffersBanner promos={promos} onOpen={(p) => go('Offers', { offerId: p.id })} />
          </View>
        ) : null}

        {showRate ? (
          <View style={styles.rateWrap}>
            <RateOrderCard
              title="Rate your last visit"
              subtitle="Help others discover great places"
              onClose={() => setShowRate(false)}
              onRate={(n) => go('Bookings', { screen: 'Review', params: { rating: n } })}
            />
          </View>
        ) : null}
      </ScrollView>

      <BottomNavigation
        active="dineout"
        onChange={(id) => {
          if (id === 'quick') go('RestaurantList', { title: 'Table in 15 min', city });
          else if (id === 'offers' || id === 'win') go('Offers');
          else if (id === 'bookings') go('Bookings');
          else if (id === 'paybill') go('PayBill');
        }}
        bottomInset={insets.bottom}
      />

      <LocationGate
        visible={locGateOpen}
        onResolved={handleLocationResolved}
        onManual={handleLocationManual}
        onClose={() => setLocGateOpen(false)}
      />


      <Sheet visible={locOpen} onClose={() => setLocOpen(false)} title="Choose your city">
        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          {['All cities', ...cityList].map((c, i) => {
            const value = c === 'All cities' ? null : c;
            const active = (city || null) === value;
            return (
              <View key={c}>
                {i > 0 ? <Divider spacing={0} /> : null}
                <Pressable
                  style={styles.cityRow}
                  onPress={() => { setCity(value); setLocOpen(false); }}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={active ? COLOR.terracotta : COLOR.inkFaint}
                  />
                  <Text style={[text.bodyInk, active && styles.cityActive]}>{c}</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </Sheet>
    </View>
  );
}

function cuisineList(featured = [], trending = []) {
  const set = new Set();
  [...(featured || []), ...(trending || [])].forEach((r) => {
    (r.cuisine || []).forEach((c) => c && set.add(c));
    (r.categories || []).forEach((c) => c && set.add(c));
  });
  return Array.from(set).slice(0, 12).map((c) => ({ id: c.toLowerCase().replace(/\s+/g, ''), label: c }));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.surface },
  navyZone: {
    backgroundColor: COLOR.navy,
    paddingBottom: 230, // extra hero image below the chips before the curve
    borderBottomLeftRadius: 56,
    borderBottomRightRadius: 56,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xs,
  },
  location: {
    flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, paddingRight: SPACING.md,
  },
  locText: { fontFamily: FONT.semiBold, fontSize: 15, color: COLOR.onNavy, flexShrink: 1 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  bell: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLOR.onNavyFill,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 9, right: 10,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#F9A91B',
    borderWidth: 1.5, borderColor: COLOR.navy,
  },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, marginTop: SPACING.sm,
    backgroundColor: COLOR.surface, borderRadius: RADII.md,
    borderWidth: 1, borderColor: COLOR.hairline,
    paddingHorizontal: SPACING.md, height: 52,
  },
  searchText: { flex: 1, fontFamily: FONT.regular, fontSize: 14, color: COLOR.inkFaint },
  searchMic: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLOR.terracottaTint,
    alignItems: 'center', justifyContent: 'center',
  },
  chips: { paddingHorizontal: SPACING.lg, gap: SPACING.xs, paddingVertical: SPACING.md },
  sectionHead: { paddingHorizontal: SPACING.lg, marginTop: SPACING.sm, marginBottom: SPACING.sm },
  rail: { paddingHorizontal: SPACING.lg, gap: SPACING.md, paddingVertical: SPACING.xs },
  railPad: { paddingHorizontal: SPACING.lg },
  skelFeature: { width: 230, backgroundColor: COLOR.surface, borderRadius: RADII.lg, padding: SPACING.sm },
  bannerWrap: { marginTop: SPACING.xs, marginBottom: SPACING.xs },
  skelBanner: { height: 150, backgroundColor: COLOR.surface, borderRadius: RADII.lg },
  togRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },
  toggle: { flexDirection: 'row', backgroundColor: COLOR.surfaceAlt, borderRadius: RADII.pill, padding: 3 },
  toggleBtn: { paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: RADII.pill },
  toggleBtnOn: { backgroundColor: COLOR.surface },
  toggleText: { fontFamily: FONT.semiBold, fontSize: 12, color: COLOR.inkSoft },
  toggleTextOn: { color: COLOR.terracotta },
  rateWrap: { marginTop: SPACING.xl },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md },
  cityActive: { fontFamily: FONT.semiBold, color: COLOR.terracotta },
});
