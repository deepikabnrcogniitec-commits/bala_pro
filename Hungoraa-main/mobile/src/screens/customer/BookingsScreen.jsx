import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, StatusBar, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import bookingApi from '../../api/booking.api';
import { COLORS, FONTS, SIZES, SPACING, BORDER_RADIUS, SHADOW } from '../../constants';

const TABS = ['Upcoming', 'Completed', 'Cancelled'];

const STATUS_COLORS = {
  confirmed: COLORS.secondary,
  pending: COLORS.warning,
  cancelled: COLORS.error,
  completed: COLORS.info,
  seated: COLORS.secondary,
};

export default function BookingsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const statusMap = {
    Upcoming: ['confirmed', 'pending'],
    Completed: ['completed', 'seated'],
    Cancelled: ['cancelled', 'no-show'],
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-bookings', activeTab],
    queryFn: () =>
      bookingApi.getMyBookings({ status: statusMap[activeTab].join(',') }).then((r) => r.data.data),
  });

  const bookings = data?.bookings || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderBooking = ({ item }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => navigation.navigate('BookingDetail', { bookingId: item._id || item.id })}
      activeOpacity={0.9}
    >
      <View style={styles.cardTop}>
        <Image
          source={{ uri: item.restaurantImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200' }}
          style={styles.restaurantImage}
          contentFit="cover"
        />
        <View style={styles.cardInfo}>
          <Text style={styles.restaurantName} numberOfLines={1}>{item.restaurantName}</Text>
          <Text style={styles.location}>{item.city}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]} />
            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
              {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={styles.bookingCode}>#{item.bookingId || item.id}</Text>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardBottom}>
        <View style={styles.bookingMeta}>
          <MetaItem icon="calendar-outline" text={item.date} />
          <MetaItem icon="time-outline" text={item.time} />
          <MetaItem icon="people-outline" text={`${item.guests} guests`} />
        </View>

        {activeTab === 'Upcoming' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.navigate('BookingDetail', { bookingId: item._id || item.id })}
            >
              <Text style={styles.cancelBtnText}>Manage</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'Completed' && !item.hasReview && (
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() => navigation.navigate('Review', { bookingId: item._id || item.id, restaurantName: item.restaurantName })}
          >
            <Ionicons name="star-outline" size={14} color={COLORS.primary} />
            <Text style={styles.reviewBtnText}>Write Review</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#1B5E8F', '#0C2F4E']} style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSub}>Manage your reservations</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item._id || item.id}
        renderItem={renderBooking}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>No {activeTab} Bookings</Text>
            <Text style={styles.emptySub}>
              {activeTab === 'Upcoming'
                ? "You don't have any upcoming reservations. Discover amazing restaurants!"
                : `No ${activeTab.toLowerCase()} bookings found.`}
            </Text>
            {activeTab === 'Upcoming' && (
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => navigation.navigate('Home')}
              >
                <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.exploreBtnGrad}>
                  <Text style={styles.exploreBtnText}>Explore Restaurants</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

function MetaItem({ icon, text }) {
  return (
    <View style={metaStyles.item}>
      <Ionicons name={icon} size={13} color={COLORS.gray} />
      <Text style={metaStyles.text}>{text}</Text>
    </View>
  );
}

const metaStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  headerTitle: { fontSize: SIZES.h2, fontFamily: FONTS.bold, color: COLORS.white },
  headerSub: { fontSize: SIZES.sm, color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.regular, marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: SIZES.sm, fontFamily: FONTS.medium, color: COLORS.gray },
  tabTextActive: { color: COLORS.primary, fontFamily: FONTS.bold },
  list: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 100 },
  bookingCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  cardTop: { flexDirection: 'row', gap: SPACING.md, padding: SPACING.md },
  restaurantImage: { width: 70, height: 70, borderRadius: BORDER_RADIUS.md },
  cardInfo: { flex: 1 },
  restaurantName: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.dark },
  location: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: SIZES.xs, fontFamily: FONTS.bold },
  bookingCode: { fontSize: SIZES.xs, color: COLORS.lightGray, fontFamily: FONTS.regular },
  cardDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  cardBottom: { padding: SPACING.md, gap: SPACING.sm },
  bookingMeta: { flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  cancelBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  cancelBtnText: { fontSize: SIZES.xs, color: COLORS.primary, fontFamily: FONTS.bold },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primaryBg,
  },
  reviewBtnText: { fontSize: SIZES.xs, color: COLORS.primary, fontFamily: FONTS.bold },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: SPACING.xl },
  emptyEmoji: { fontSize: 64, marginBottom: SPACING.md },
  emptyTitle: { fontSize: SIZES.lg, fontFamily: FONTS.bold, color: COLORS.dark, marginBottom: 8 },
  emptySub: { fontSize: SIZES.base, color: COLORS.gray, textAlign: 'center', lineHeight: 22, fontFamily: FONTS.regular, marginBottom: SPACING.xl },
  exploreBtn: { borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
  exploreBtnGrad: { paddingHorizontal: SPACING.xl, paddingVertical: 14 },
  exploreBtnText: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.white },
});
