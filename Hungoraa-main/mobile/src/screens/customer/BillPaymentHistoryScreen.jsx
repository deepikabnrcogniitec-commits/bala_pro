import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';
import billPaymentApi from '../../api/billPayment.api';
import { COLORS, FONTS, SIZES, SPACING, BORDER_RADIUS, SHADOW } from '../../constants';
import dayjs from 'dayjs';

function PaymentItem({ item }) {
  const isPaid = item.paymentStatus === 'paid';
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.dot, { backgroundColor: isPaid ? '#2d6a4f' : '#e63946' }]}>
          <Ionicons name={isPaid ? 'checkmark' : 'close'} size={14} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.restaurantName} numberOfLines={1}>
            {item.restaurant?.name || 'Restaurant'}
          </Text>
          <Text style={styles.date}>{dayjs(item.createdAt).format('DD MMM YYYY, h:mm A')}</Text>
          <Text style={styles.ref} numberOfLines={1}>{item.billPaymentId}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.amount}>₹{item.finalAmount?.toLocaleString()}</Text>
        {item.discountAmount > 0 && (
          <Text style={styles.saved}>Saved ₹{item.discountAmount?.toLocaleString()}</Text>
        )}
        <View style={[styles.statusBadge, { backgroundColor: isPaid ? '#d8f3dc' : '#fce4ec' }]}>
          <Text style={[styles.statusText, { color: isPaid ? '#2d6a4f' : '#e63946' }]}>
            {item.paymentStatus?.toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function BillPaymentHistoryScreen({ navigation }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['bill-payment-history'],
    queryFn: ({ pageParam = 1 }) =>
      billPaymentApi.getMyHistory({ page: pageParam, limit: 20 }).then((r) => r.data.data),
    getNextPageParam: (last) =>
      last.pagination?.page < last.pagination?.pages ? last.pagination.page + 1 : undefined,
    initialPageParam: 1,
  });

  const payments = data?.pages.flatMap((p) => p.billPayments || []) || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1B5E8F', '#0C2F4E']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Payment History</Text>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : payments.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 40, marginBottom: 8 }}>🧾</Text>
          <Text style={styles.emptyTitle}>No payments yet</Text>
          <Text style={styles.emptySub}>Pay your restaurant bill via the app to see history here</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: SPACING.md }}
          renderItem={({ item }) => <PaymentItem item={item} />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg,
  },
  back: { padding: 4 },
  headerTitle: { fontSize: SIZES.lg, fontFamily: FONTS.bold, color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: SPACING.xl },
  emptyTitle: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.dark },
  emptySub: { fontSize: SIZES.sm, fontFamily: FONTS.regular, color: COLORS.gray, textAlign: 'center', paddingHorizontal: 40 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm,
  },
  cardLeft: { flexDirection: 'row', gap: SPACING.md, flex: 1 },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  restaurantName: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.dark },
  date: { fontSize: SIZES.xs, fontFamily: FONTS.regular, color: COLORS.gray, marginTop: 2 },
  ref: { fontSize: 10, fontFamily: 'monospace', color: COLORS.lightGray, marginTop: 2 },
  amount: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.dark },
  saved: { fontSize: SIZES.xs, fontFamily: FONTS.medium, color: '#2d6a4f', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  statusText: { fontSize: 10, fontFamily: FONTS.bold },
});
