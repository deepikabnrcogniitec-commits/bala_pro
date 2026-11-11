import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import bookingApi from '../../api/booking.api';
import invoiceApi from '../../api/invoice.api';
import { COLORS, FONTS, SIZES, SPACING, BORDER_RADIUS, SHADOW } from '../../constants';

const STATUS_CONFIG = {
  confirmed: { color: '#2d6a4f', bg: '#d8f3dc', label: 'Confirmed', icon: 'checkmark-circle' },
  pending:   { color: '#C8952B', bg: '#F7EDD8', label: 'Pending',   icon: 'time' },
  seated:    { color: '#1a6fa8', bg: '#dbeafe', label: 'Seated',    icon: 'restaurant' },
  completed: { color: '#087f5b', bg: '#c3fae8', label: 'Completed', icon: 'trophy' },
  cancelled: { color: '#c92a2a', bg: '#ffe3e3', label: 'Cancelled', icon: 'close-circle' },
  'no-show': { color: '#868e96', bg: '#f1f3f5', label: 'No Show',   icon: 'ban' },
};

// ─── Invoice Bill Card ────────────────────────────────────────────────────────
function InvoiceCard({ bookingId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['invoice', bookingId],
    queryFn: () => invoiceApi.getByBooking(bookingId).then((r) => r.data.data.invoice),
    retry: false,
  });

  if (isLoading) {
    return (
      <View style={inv.card}>
        <ActivityIndicator color={COLORS.primary} size="small" />
        <Text style={inv.loadText}>Checking for bill...</Text>
      </View>
    );
  }

  if (!data || error) {
    return (
      <View style={inv.card}>
        <Ionicons name="receipt-outline" size={28} color={COLORS.lightGray} />
        <Text style={inv.emptyTitle}>No Bill Yet</Text>
        <Text style={inv.emptyText}>Your bill will appear here once the restaurant generates it.</Text>
      </View>
    );
  }

  const isPaid = data.paymentStatus === 'paid';

  return (
    <View style={inv.card}>
      <View style={inv.header}>
        <View>
          <Text style={inv.invoiceId}>Invoice #{data.invoiceId}</Text>
          <Text style={inv.method}>{data.paymentMethod?.toUpperCase()}</Text>
        </View>
        <View style={[inv.badge, { backgroundColor: isPaid ? '#d8f3dc' : '#F7EDD8' }]}>
          <Text style={[inv.badgeText, { color: isPaid ? '#2d6a4f' : '#C8952B' }]}>
            {isPaid ? '✓ Paid' : 'Pending'}
          </Text>
        </View>
      </View>

      <View style={inv.divider} />

      <View style={inv.row}>
        <Text style={inv.rowLabel}>Food Bill</Text>
        <Text style={inv.rowValue}>₹{data.subtotal?.toLocaleString()}</Text>
      </View>

      {data.discountAmount > 0 && (
        <View style={inv.row}>
          <Text style={[inv.rowLabel, { color: '#2d6a4f' }]}>
            Discount {data.offerCode ? `(${data.offerCode})` : ''}
          </Text>
          <Text style={[inv.rowValue, { color: '#2d6a4f' }]}>
            - ₹{data.discountAmount?.toLocaleString()}
          </Text>
        </View>
      )}

      <View style={inv.row}>
        <Text style={inv.rowLabel}>GST ({data.taxPercentage}%)</Text>
        <Text style={inv.rowValue}>+ ₹{data.taxAmount?.toLocaleString()}</Text>
      </View>

      <View style={inv.totalDivider} />

      <View style={inv.row}>
        <Text style={inv.totalLabel}>You Paid</Text>
        <Text style={inv.totalValue}>₹{data.finalAmount?.toLocaleString()}</Text>
      </View>

      {isPaid && data.paidAt && (
        <Text style={inv.paidAt}>
          Paid on {new Date(data.paidAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BookingDetailScreen({ navigation, route }) {
  const { bookingId } = route.params;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingApi.getById(bookingId).then((r) => r.data.data.booking),
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingApi.cancel(bookingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      Alert.alert('Cancelled', 'Your booking has been cancelled.');
      navigation.goBack();
    },
    onError: (err) => Alert.alert('Error', err.response?.data?.message || 'Could not cancel'),
  });

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMutation.mutate() },
    ]);
  };

  const booking = data;

  if (isLoading || !booking) {
    return (
      <View style={styles.loadContainer}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#1B5E8F', '#0C2F4E']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </View>
    );
  }

  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const canCancel = ['pending', 'confirmed'].includes(booking.status);
  const canReview = booking.status === 'completed' && !booking.hasReview;
  const showInvoice = ['seated', 'completed'].includes(booking.status);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#1B5E8F', '#0C2F4E']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <Text style={styles.headerSub}>#{booking.bookingId}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
          <Ionicons name={`${cfg.icon}-outline`} size={13} color={cfg.color} />
          <Text style={[styles.statusChipText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Restaurant */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RESTAURANT</Text>
          <Text style={styles.restaurantName}>{booking.restaurant?.name}</Text>
          {booking.branch?.name && (
            <Text style={styles.dim}>📍 {booking.branch.name}</Text>
          )}
        </View>

        {/* Date / Time / Guests / Table */}
        <View style={styles.gridRow}>
          {[
            { icon: 'calendar-outline', label: 'Date', value: booking.date },
            { icon: 'time-outline', label: 'Time', value: booking.time },
            { icon: 'people-outline', label: 'Guests', value: `${booking.guests}` },
            { icon: 'restaurant-outline', label: 'Table', value: booking.table?.name || 'TBD' },
          ].map(({ icon, label, value }) => (
            <View key={label} style={styles.gridCell}>
              <Ionicons name={icon} size={16} color={COLORS.primary} />
              <Text style={styles.gridLabel}>{label}</Text>
              <Text style={styles.gridValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Special Request */}
        {booking.specialRequest ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SPECIAL REQUEST</Text>
            <Text style={styles.bodyText}>{booking.specialRequest}</Text>
          </View>
        ) : null}

        {/* Bill / Invoice */}
        {showInvoice && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BILL DETAILS</Text>
            <InvoiceCard bookingId={booking._id} />
          </View>
        )}

        {/* Advance Payment info */}
        {booking.depositAmount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ADVANCE PAID</Text>
            <View style={styles.payRow}>
              <Text style={styles.bodyText}>₹{booking.depositAmount} advance deposit</Text>
              <View style={[styles.pill, { backgroundColor: booking.isPaid ? '#d8f3dc' : '#F7EDD8' }]}>
                <Text style={{ color: booking.isPaid ? '#2d6a4f' : '#C8952B', fontSize: 12, fontWeight: '700' }}>
                  {booking.isPaid ? '✓ Paid' : 'Pending'}
                </Text>
              </View>
            </View>
            {booking.discountAmount > 0 && (
              <Text style={{ color: '#2d6a4f', fontSize: 13, marginTop: 4 }}>
                🏷️ {booking.couponCode} — saved ₹{booking.discountAmount}
              </Text>
            )}
          </View>
        )}

        {/* Timeline */}
        {booking.statusHistory?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TIMELINE</Text>
            {booking.statusHistory.map((h, i) => {
              const c = STATUS_CONFIG[h.status] || STATUS_CONFIG.pending;
              return (
                <View key={i} style={styles.timelineRow}>
                  <View style={[styles.dot, { backgroundColor: c.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.timelineStatus, { color: c.color }]}>{c.label}</Text>
                    <Text style={styles.dim}>{new Date(h.timestamp).toLocaleString('en-IN')}</Text>
                    {h.reason && <Text style={styles.dim}>{h.reason}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Actions */}
        <View style={{ gap: 12, marginTop: 8, paddingBottom: 40 }}>
          {canReview && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: COLORS.primary }]}
              onPress={() => navigation.navigate('Review', {
                bookingId,
                restaurantId: booking.restaurant?._id,
                restaurantName: booking.restaurant?.name,
              })}
            >
              <Ionicons name="star-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Write a Review</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending
                ? <ActivityIndicator color={COLORS.error} />
                : <>
                    <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
                    <Text style={[styles.btnText, { color: COLORS.error }]}>Cancel Booking</Text>
                  </>
              }
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadContainer: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: SIZES.lg, fontFamily: FONTS.bold, color: '#fff' },
  headerSub: { fontSize: SIZES.xs, color: 'rgba(255,255,255,0.6)', fontFamily: FONTS.regular },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusChipText: { fontSize: SIZES.xs, fontFamily: FONTS.bold },
  body: { flex: 1 },
  section: {
    backgroundColor: COLORS.card,
    marginBottom: 8,
    padding: SPACING.lg,
  },
  sectionLabel: {
    fontSize: 10, fontFamily: FONTS.bold, color: COLORS.gray,
    letterSpacing: 1.2, marginBottom: SPACING.sm,
  },
  restaurantName: { fontSize: SIZES.lg, fontFamily: FONTS.bold, color: COLORS.dark },
  dim: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular, marginTop: 2 },
  bodyText: { fontSize: SIZES.base, fontFamily: FONTS.medium, color: COLORS.dark },
  gridRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: COLORS.card, marginBottom: 8,
  },
  gridCell: {
    width: '50%', padding: SPACING.md,
    alignItems: 'flex-start', gap: 4,
    borderBottomWidth: 1, borderRightWidth: 1, borderColor: COLORS.border,
  },
  gridLabel: { fontSize: SIZES.xs, fontFamily: FONTS.regular, color: COLORS.gray },
  gridValue: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.dark },
  payRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, marginTop: 3 },
  timelineStatus: { fontSize: SIZES.sm, fontFamily: FONTS.bold },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: BORDER_RADIUS.md, padding: 16,
  },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: BORDER_RADIUS.md, padding: 16,
    borderWidth: 1.5, borderColor: COLORS.error, backgroundColor: COLORS.card,
  },
  btnText: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: '#fff' },
});

const inv = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    backgroundColor: COLORS.sunken,
    alignItems: 'center',
    gap: 4,
  },
  loadText: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular, marginTop: 6 },
  emptyTitle: { fontSize: SIZES.sm, fontFamily: FONTS.bold, color: COLORS.dark, marginTop: 8 },
  emptyText: { fontSize: SIZES.xs, fontFamily: FONTS.regular, color: COLORS.gray, textAlign: 'center', marginTop: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 4 },
  invoiceId: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.dark },
  method: { fontSize: SIZES.xs, fontFamily: FONTS.regular, color: COLORS.gray, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: SIZES.xs, fontFamily: FONTS.bold },
  divider: { height: 1, backgroundColor: COLORS.border, width: '100%', marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 3 },
  rowLabel: { fontSize: SIZES.sm, fontFamily: FONTS.regular, color: COLORS.gray },
  rowValue: { fontSize: SIZES.sm, fontFamily: FONTS.medium, color: COLORS.dark },
  totalDivider: { height: 1.5, backgroundColor: COLORS.dark, width: '100%', marginVertical: 8 },
  totalLabel: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.dark },
  totalValue: { fontSize: SIZES.lg, fontFamily: FONTS.bold, color: COLORS.primary },
  paidAt: { fontSize: SIZES.xs, fontFamily: FONTS.regular, color: COLORS.gray, marginTop: 4, alignSelf: 'flex-end' },
});
