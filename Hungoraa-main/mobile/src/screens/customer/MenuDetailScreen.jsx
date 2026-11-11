import React, { useState, useMemo } from 'react';
import { View, Text, SectionList, StyleSheet, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { restaurantApi } from '../../api/restaurant.api';
import { COLOR, SPACING, RADII, text, FONT } from '../../theme';
import {
  Screen, AppBar, PhotoImage, Tag, Chip, EmptyState, SkeletonRow,
} from '../../components/ui';

export default function MenuDetailScreen({ navigation, route }) {
  const { restaurantId, restaurantName } = route.params || {};
  const [vegOnly, setVegOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => restaurantApi.getMenu(restaurantId),
  });

  const menu = data?.data?.data?.menu || data?.data?.data || { categories: [] };

  const sections = useMemo(() => (
    (menu.categories || [])
      .map((cat) => ({
        title: cat.name,
        data: (cat.items || []).filter((item) => (vegOnly ? item.isVeg : true)),
      }))
      .filter((s) => s.data.length > 0)
  ), [menu, vegOnly]);

  return (
    <Screen edges={['top']}>
      <AppBar
        title={restaurantName || 'Menu'}
        onBack={() => navigation.goBack()}
        right={
          <Chip
            label="Veg only"
            icon={vegOnly ? 'leaf' : 'leaf-outline'}
            selected={vegOnly}
            onPress={() => setVegOnly((v) => !v)}
          />
        }
      />

      {isLoading ? (
        <View style={styles.pad}>
          {[0, 1, 2, 3].map((i) => <SkeletonRow key={i} />)}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, i) => item._id || `${item.name}-${i}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={[text.overline, styles.sectionTitle]}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => <MenuItem item={item} />}
          ListEmptyComponent={
            <EmptyState icon="restaurant-outline" title="No menu items" message="This menu hasn't been published yet." />
          }
        />
      )}
    </Screen>
  );
}

function MenuItem({ item }) {
  const off = !item.isAvailable;
  return (
    <View style={[styles.item, off && styles.itemOff]}>
      <View style={styles.info}>
        <View style={styles.badgeRow}>
          <View style={[styles.vegDot, { borderColor: item.isVeg ? COLOR.success : COLOR.error }]}>
            <View style={[styles.vegInner, { backgroundColor: item.isVeg ? COLOR.success : COLOR.error }]} />
          </View>
          {off ? <Tag label="Unavailable" tone="neutral" /> : null}
        </View>
        <Text style={text.bodyStrong}>{item.name}</Text>
        <Text style={styles.price}>₹{item.price}</Text>
        {item.description ? (
          <Text style={[text.caption, styles.desc]} numberOfLines={2}>{item.description}</Text>
        ) : null}
        {item.calories ? <Tag label={`${item.calories} cal`} tone="warning" icon="flame-outline" style={styles.cal} /> : null}
      </View>
      {item.image?.url ? (
        <PhotoImage uri={item.image.url} style={styles.img} radius={RADII.sm} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: SPACING.lg, gap: SPACING.xs },
  list: { padding: SPACING.lg, paddingTop: SPACING.xs },
  sectionHeader: { backgroundColor: COLOR.bg, paddingVertical: SPACING.sm },
  sectionTitle: {},
  item: {
    flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start',
    backgroundColor: COLOR.surface, borderRadius: RADII.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  itemOff: { opacity: 0.55 },
  info: { flex: 1, gap: 3 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 2 },
  vegDot: { width: 15, height: 15, borderRadius: 3, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  vegInner: { width: 7, height: 7, borderRadius: 4 },
  price: { fontFamily: FONT.semiBold, fontSize: 14, color: COLOR.ink, marginTop: 1 },
  desc: { marginTop: 3 },
  cal: { marginTop: 6 },
  img: { width: 84, height: 84 },
});
