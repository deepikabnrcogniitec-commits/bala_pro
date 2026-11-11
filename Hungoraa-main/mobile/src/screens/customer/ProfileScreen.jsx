import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMutation, useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import authApi from '../../api/auth.api';
import { bookingApi } from '../../api/booking.api';
import { reviewApi } from '../../api/review.api';
import { restaurantApi } from '../../api/restaurant.api';
import { paymentApi } from '../../api/payment.api';
import { useAuthStore } from '../../store/authStore';
import { COLORS, FONTS, SIZES, SPACING, BORDER_RADIUS, SHADOW } from '../../constants';

const MENU_SECTIONS = [
  {
    title: 'Account',
    items: [
      { icon: 'person-outline', label: 'Edit Profile', screen: 'EditProfile', color: COLORS.primary },
      { icon: 'heart-outline', label: 'Saved Restaurants', screen: 'SavedRestaurants', color: '#e63946' },
      { icon: 'wallet-outline', label: 'My Wallet', screen: 'Wallet', color: '#2d6a4f' },
      { icon: 'notifications-outline', label: 'Notifications', screen: 'Notifications', color: '#457b9d' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: 'location-outline', label: 'Saved Addresses', screen: null, color: '#C8952B' },
      { icon: 'card-outline', label: 'Payment Methods', screen: null, color: '#6b4fbb' },
      { icon: 'language-outline', label: 'Language', screen: null, color: '#457b9d', value: 'English' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: 'help-circle-outline', label: 'Help & Support', screen: null, color: '#457b9d' },
      { icon: 'document-text-outline', label: 'Terms & Privacy', screen: null, color: COLORS.gray },
      { icon: 'star-outline', label: 'Rate Us', screen: null, color: COLORS.rating },
    ],
  },
];

export default function ProfileScreen({ navigation }) {
  const { user, refreshToken, logout } = useAuthStore();

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(refreshToken),
    onSuccess: () => logout(),
    onError: () => logout(),
  });

  const { data: bookingsData } = useQuery({
    queryKey: ['profile-stats', 'bookings'],
    queryFn: () => bookingApi.getMyBookings({ limit: 1 }),
  });
  const { data: reviewsData } = useQuery({
    queryKey: ['profile-stats', 'reviews'],
    queryFn: () => reviewApi.getMy({ limit: 1 }),
  });
  const { data: savedData } = useQuery({
    queryKey: ['saved-restaurants'],
    queryFn: () => restaurantApi.getSaved(),
  });
  const { data: walletData } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => paymentApi.getWallet(),
  });

  const bookingsCount = bookingsData?.data?.meta?.pagination?.total ?? 0;
  const reviewsCount = reviewsData?.data?.meta?.pagination?.total ?? 0;
  const savedCount = savedData?.data?.data?.restaurants?.length ?? 0;
  const walletBalance = walletData?.data?.data?.wallet?.balance ?? 0;

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logoutMutation.mutate() },
    ]);
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1B5E8F', '#0C2F4E']} style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>

        <View style={styles.profileCard}>
          {user?.avatar?.url ? (
            <Image source={{ uri: user.avatar.url }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'Guest User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || user?.phone || ''}</Text>
            <View style={styles.badgeRow}>
              {user?.isEmailVerified && (
                <View style={styles.badge}>
                  <Ionicons name="checkmark-circle" size={12} color={COLORS.secondary} />
                  <Text style={styles.badgeText}>Verified</Text>
                </View>
              )}
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{user?.role?.toUpperCase() || 'CUSTOMER'}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editIconBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="pencil" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatItem value={String(bookingsCount)} label="Bookings" />
          <View style={styles.statDivider} />
          <StatItem value={String(reviewsCount)} label="Reviews" />
          <View style={styles.statDivider} />
          <StatItem value={String(savedCount)} label="Saved" />
          <View style={styles.statDivider} />
          <StatItem value={`₹${walletBalance.toFixed(0)}`} label="Wallet" />
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuItem, index < section.items.length - 1 && styles.menuItemBorder]}
                  onPress={() => item.screen ? navigation.navigate(item.screen) : null}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, { backgroundColor: `${item.color}18` }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <View style={styles.menuRight}>
                    {item.value && <Text style={styles.menuValue}>{item.value}</Text>}
                    <Ionicons name="chevron-forward" size={16} color={COLORS.lightGray} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <View style={styles.menuSection}>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout} activeOpacity={0.7}>
              <View style={[styles.menuIcon, { backgroundColor: `${COLORS.error}18` }]}>
                <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
              </View>
              <Text style={[styles.menuLabel, { color: COLORS.error }]}>Log Out</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.version}>Hungora v1.0.0</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function StatItem({ value, label }) {
  return (
    <View style={statStyles.item}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center' },
  value: { fontSize: SIZES.xl, fontFamily: FONTS.bold, color: COLORS.white },
  label: { fontSize: SIZES.xs, color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.regular, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  headerTitle: { fontSize: SIZES.xl, fontFamily: FONTS.bold, color: COLORS.white, marginBottom: SPACING.md },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  avatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarPlaceholder: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarInitials: { fontSize: SIZES.xl, fontFamily: FONTS.bold, color: COLORS.white },
  profileInfo: { flex: 1 },
  profileName: { fontSize: SIZES.lg, fontFamily: FONTS.bold, color: COLORS.white },
  profileEmail: { fontSize: SIZES.sm, color: 'rgba(255,255,255,0.65)', fontFamily: FONTS.regular, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: 6 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(45,106,79,0.3)', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeText: { fontSize: 10, color: '#40916c', fontFamily: FONTS.medium },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  roleBadgeText: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontFamily: FONTS.bold },
  editIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
  },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  body: { flex: 1 },
  menuSection: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  sectionTitle: { fontSize: SIZES.sm, fontFamily: FONTS.bold, color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm },
  menuCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: SIZES.base, fontFamily: FONTS.medium, color: COLORS.dark },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  menuValue: { fontSize: SIZES.sm, color: COLORS.gray, fontFamily: FONTS.regular },
  version: { textAlign: 'center', fontSize: SIZES.xs, color: COLORS.lightGray, fontFamily: FONTS.regular, marginTop: SPACING.lg },
});
