import React from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restaurantApi } from '../../api/restaurant.api';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants';

function PriceRange({ value }) {
  return <Text style={styles.price}>{'₹'.repeat(value)}{'₹'.repeat(4 - value).replace(/₹/g, '·')}</Text>;
}

export default function SavedRestaurantsScreen({ navigation }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['saved-restaurants'],
    queryFn: () => restaurantApi.getSaved(),
  });

  const unsaveMutation = useMutation({
    mutationFn: (id) => restaurantApi.toggleSave(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-restaurants'] }),
  });

  const restaurants = data?.data?.data?.restaurants || [];

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('Home', { screen: 'RestaurantDetail', params: { restaurantId: item._id } })}
    >
      <View style={styles.imagePlaceholder}>
        {item.coverImages?.[0]?.url ? (
          <Image source={{ uri: item.coverImages[0].url }} style={styles.image} />
        ) : (
          <Text style={{ fontSize: 40 }}>🍽️</Text>
        )}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.meta}>{item.cuisine?.slice(0, 2).join(' • ')} · {item.city}</Text>
          </View>
          <TouchableOpacity
            onPress={() => unsaveMutation.mutate(item._id)}
            style={styles.heartBtn}
          >
            <Text style={{ fontSize: 20 }}>❤️</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardBottom}>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>⭐ {item.averageRating?.toFixed(1)}</Text>
          </View>
          <PriceRange value={item.priceRange} />
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => navigation.navigate('Home', { screen: 'RestaurantDetail', params: { restaurantId: item._id } })}
          >
            <Text style={styles.bookBtnText}>Book Table</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Restaurants</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🤍</Text>
              <Text style={styles.emptyTitle}>No saved restaurants</Text>
              <Text style={styles.emptyText}>Tap ❤️ on any restaurant to save it here</Text>
              <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('Search')}>
                <Text style={styles.exploreBtnText}>Explore Restaurants</Text>
              </TouchableOpacity>
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
    backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.lg, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  imagePlaceholder: {
    height: 150, backgroundColor: '#EAE2D6', justifyContent: 'center', alignItems: 'center',
  },
  image: { width: '100%', height: '100%' },
  cardBody: { padding: SPACING.md },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  name: { fontSize: 16, fontWeight: '700', color: '#1E1B18' },
  meta: { fontSize: 12, color: '#6F6862', marginTop: 3 },
  heartBtn: { padding: 4 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingBadge: { backgroundColor: '#F7EDD8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#C8952B' },
  price: { fontSize: 13, color: '#6F6862', flex: 1 },
  bookBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1E1B18', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6F6862', textAlign: 'center', marginBottom: 24 },
  exploreBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
  exploreBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
