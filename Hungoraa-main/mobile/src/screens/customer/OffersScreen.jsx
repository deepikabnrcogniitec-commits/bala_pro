import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import api from '../../api/axios';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants';

const TYPE_COLORS = {
  percentage: '#457b9d', flat: '#2d6a4f', bogo: '#e63946',
  early_bird: '#C8952B', happy_hours: '#6b4fbb',
};

const TYPE_LABELS = {
  percentage: '% OFF', flat: 'FLAT OFF', bogo: 'BOGO',
  early_bird: 'EARLY BIRD', happy_hours: 'HAPPY HOURS',
};


export default function OffersScreen({ navigation }) {
  const { data, isLoading } = useQuery({
    queryKey: ['offers'],
    queryFn: () => api.get('/offers').then((r) => r.data.data.offers),
  });

  const offers = data || [];

  const copyCode = async (code) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied!', `Coupon code "${code}" copied to clipboard.`);
  };

  const renderItem = ({ item }) => {
    const color = TYPE_COLORS[item.type] || '#6F6862';
    const daysLeft = Math.max(0, Math.ceil((new Date(item.validUntil) - new Date()) / (1000 * 60 * 60 * 24)));

    return (
      <View style={[styles.card, { borderLeftColor: color }]}>
        <View style={styles.cardTop}>
          <View>
            <View style={[styles.typeBadge, { backgroundColor: color + '20' }]}>
              <Text style={[styles.typeText, { color }]}>{TYPE_LABELS[item.type] || item.type}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            {item.restaurant?.name && (
              <Text style={styles.restaurant}>🏪 {item.restaurant.name}</Text>
            )}
          </View>
          <View style={styles.discountBox}>
            <Text style={[styles.discountValue, { color }]}>
              {item.type === 'percentage' ? `${item.discountValue}%` : `₹${item.discountValue}`}
            </Text>
            <Text style={styles.discountOff}>OFF</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBottom}>
          <View style={styles.codeRow}>
            <Text style={styles.code}>{item.code}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={() => copyCode(item.code)}>
              <Text style={styles.copyText}>📋 Copy</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>Min. order ₹{item.minOrderAmount}</Text>
            <Text style={[styles.expiry, { color: daysLeft <= 3 ? '#e63946' : '#6F6862' }]}>
              {daysLeft === 0 ? 'Expires today' : `${daysLeft} days left`}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offers & Coupons</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏷️</Text>
              <Text style={styles.emptyTitle}>No offers right now</Text>
              <Text style={styles.emptyText}>Check back later for deals</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F1' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EAE2D6',
  },
  backBtn: { padding: 8 },
  backText: { fontSize: 22, color: COLORS.primary },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B18' },
  list: { padding: SPACING.md, gap: 14 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.md, borderLeftWidth: 4,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: SPACING.md },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 6 },
  typeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  title: { fontSize: 16, fontWeight: '700', color: '#1E1B18', marginBottom: 4 },
  restaurant: { fontSize: 12, color: '#6F6862' },
  discountBox: { alignItems: 'center' },
  discountValue: { fontSize: 28, fontWeight: '900' },
  discountOff: { fontSize: 11, color: '#6F6862', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#EAE2D6', marginHorizontal: SPACING.md, borderStyle: 'dashed' },
  cardBottom: { padding: SPACING.md },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  code: { fontSize: 18, fontWeight: '800', fontFamily: 'monospace', color: '#1E1B18', letterSpacing: 1 },
  copyBtn: { backgroundColor: '#EAE2D6', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  copyText: { fontSize: 13, fontWeight: '600', color: '#6F6862' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: 12, color: '#6F6862' },
  expiry: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1E1B18', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6F6862', textAlign: 'center' },
});
