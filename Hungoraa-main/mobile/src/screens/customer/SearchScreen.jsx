import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../store/appStore';
import restaurantApi from '../../api/restaurant.api';
import { toRestaurantCard } from '../../components/home/viewModels';
import { COLOR, SPACING, text } from '../../theme';
import {
  Screen, AppBar, TextField, Chip, RestaurantRow, SkeletonRow, EmptyState, Sheet, Button,
} from '../../components/ui';

const FILTER_CUISINES = ['Indian', 'Chinese', 'Italian', 'Biryani', 'Pizza', 'Burger', 'Seafood', 'Thai'];
const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'rating', label: 'Rating' },
  { id: 'distance', label: 'Distance' },
  { id: 'costLow', label: 'Cost: Low' },
  { id: 'costHigh', label: 'Cost: High' },
];

export default function SearchScreen({ navigation }) {
  const { addRecentSearch, recentSearches } = useAppStore();
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['search', activeQuery, cuisine, sortBy],
    queryFn: () =>
      restaurantApi.search(activeQuery, { cuisine, sortBy }).then((r) => r.data.data),
    enabled: !!activeQuery || !!cuisine,
  });

  const results = useMemo(
    () => (data?.restaurants || []).map((r) => toRestaurantCard(r)),
    [data],
  );

  const runSearch = useCallback((term) => {
    const q = (term ?? query).trim();
    if (!q) return;
    setQuery(q);
    setActiveQuery(q);
    addRecentSearch(q);
  }, [query, addRecentSearch]);

  const clear = () => { setQuery(''); setActiveQuery(''); };
  const open = (item) => navigation.navigate('Home', { screen: 'RestaurantDetail', params: { restaurantId: item.id, slug: item.slug } });

  const activeFilters = (cuisine ? 1 : 0) + (sortBy !== 'relevance' ? 1 : 0);
  const showResults = !!activeQuery || !!cuisine;

  return (
    <Screen edges={['top']}>
      <AppBar
        title="Search"
        onBack={() => navigation.goBack()}
        right={
          <Pressable onPress={() => setFiltersOpen(true)} hitSlop={8} style={styles.filterBtn}>
            <Ionicons name="options-outline" size={20} color={COLOR.ink} />
            {activeFilters > 0 ? <View style={styles.badge} /> : null}
          </Pressable>
        }
      />

      <View style={styles.searchWrap}>
        <TextField
          icon="search"
          placeholder="Restaurants, cuisines, a dish…"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={() => runSearch()}
          rightIcon={query ? 'close-circle' : undefined}
          onPressRightIcon={clear}
          autoFocus
        />
      </View>

      {!showResults ? (
        <View style={styles.discover}>
          {recentSearches.length > 0 ? (
            <>
              <Text style={[text.overline, styles.blockLabel]}>Recent</Text>
              <View style={styles.recentWrap}>
                {recentSearches.slice(0, 8).map((term) => (
                  <Chip key={term} label={term} icon="time-outline" onPress={() => runSearch(term)} />
                ))}
              </View>
            </>
          ) : null}

          <Text style={[text.overline, styles.blockLabel]}>Popular cuisines</Text>
          <View style={styles.recentWrap}>
            {FILTER_CUISINES.map((c) => (
              <Chip key={c} label={c} onPress={() => { setCuisine(c); }} />
            ))}
          </View>

          {recentSearches.length === 0 ? (
            <EmptyState
              icon="search-outline"
              title="Find your next table"
              message="Search by restaurant, cuisine, dish or neighbourhood."
            />
          ) : null}
        </View>
      ) : (
        <FlatList
          data={isLoading ? [] : results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.results}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListHeaderComponent={
            <Text style={[text.caption, styles.count]}>
              {isLoading
                ? 'Searching…'
                : `${results.length} ${results.length === 1 ? 'result' : 'results'}${activeQuery ? ` for "${activeQuery}"` : ''}`}
            </Text>
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.skelWrap}>
                {[0, 1, 2, 3].map((i) => <SkeletonRow key={i} />)}
              </View>
            ) : (
              <EmptyState
                icon="sad-outline"
                title="No matches"
                message="Try a different spelling or a broader term."
              />
            )
          }
          renderItem={({ item }) => (
            <RestaurantRow item={item} onPress={() => open(item)} />
          )}
        />
      )}

      <Sheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <Text style={[text.overline, styles.blockLabel]}>Cuisine</Text>
        <View style={styles.recentWrap}>
          {FILTER_CUISINES.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={cuisine === c}
              onPress={() => setCuisine(cuisine === c ? '' : c)}
            />
          ))}
        </View>
        <Text style={[text.overline, styles.blockLabel, styles.mt]}>Sort by</Text>
        <View style={styles.recentWrap}>
          {SORT_OPTIONS.map((o) => (
            <Chip
              key={o.id}
              label={o.label}
              selected={sortBy === o.id}
              onPress={() => setSortBy(o.id)}
            />
          ))}
        </View>
        <Button label="Show results" onPress={() => setFiltersOpen(false)} style={styles.applyBtn} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterBtn: { padding: 6 },
  badge: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLOR.terracotta,
  },
  searchWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  discover: { padding: SPACING.lg, gap: SPACING.sm },
  blockLabel: { marginBottom: 4 },
  mt: { marginTop: SPACING.lg },
  recentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  results: { padding: SPACING.lg, paddingTop: SPACING.xs },
  count: { marginBottom: SPACING.sm },
  sep: { height: SPACING.sm },
  skelWrap: { gap: SPACING.xs },
  applyBtn: { marginTop: SPACING.xl },
});
