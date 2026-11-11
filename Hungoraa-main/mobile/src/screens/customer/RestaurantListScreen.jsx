import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { restaurantApi } from '../../api/restaurant.api';
import { toRestaurantCard } from '../../components/home/viewModels';
import { COLOR, SPACING } from '../../theme';
import {
  Screen, AppBar, TextField, Chip, RestaurantCard, SkeletonCard, EmptyState,
} from '../../components/ui';

const SORT_OPTIONS = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Top rated', value: 'rating' },
  { label: 'Price: low', value: 'price_asc' },
  { label: 'Price: high', value: 'price_desc' },
];

export default function RestaurantListScreen({ navigation, route }) {
  const { city, cuisine, title } = route.params || {};
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('relevance');

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['restaurant-list', city, cuisine, search, sort],
    queryFn: () => restaurantApi.getAll({ city, cuisine, search, sort }).then((r) => r.data.data),
  });

  const items = useMemo(
    () => (data?.restaurants || []).map((r) => toRestaurantCard(r)),
    [data],
  );

  const openDetail = (item) =>
    navigation.navigate('RestaurantDetail', { restaurantId: item.id, slug: item.slug });

  return (
    <Screen edges={['top']}>
      <AppBar title={title || 'Restaurants'} onBack={() => navigation.goBack()} />

      <View style={styles.controls}>
        <TextField
          icon="search"
          placeholder="Search restaurants, cuisines…"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        <FlatList
          data={SORT_OPTIONS}
          keyExtractor={(o) => o.value}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortRow}
          renderItem={({ item }) => (
            <Chip
              label={item.label}
              selected={sort === item.value}
              onPress={() => setSort(item.value)}
            />
          )}
        />
      </View>

      {isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} style={styles.skel} />)}
        </View>
      ) : isError ? (
        <EmptyState
          tone="error"
          icon="cloud-offline-outline"
          title="Couldn't load restaurants"
          message="Check your connection and try again."
          actionLabel="Retry"
          onAction={refetch}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          renderItem={({ item }) => (
            <RestaurantCard item={item} layout="full" onPress={() => openDetail(item)} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="restaurant-outline"
              title="No restaurants found"
              message={city ? `We couldn't find places in ${city}. Try a different filter.` : 'Try adjusting your filters.'}
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.sm },
  sortRow: { gap: SPACING.xs, paddingVertical: 2 },
  list: { padding: SPACING.lg, paddingTop: SPACING.xs },
  gap: { height: SPACING.md },
  skel: { marginBottom: SPACING.lg, backgroundColor: COLOR.surface, borderRadius: 22, padding: SPACING.sm },
});
