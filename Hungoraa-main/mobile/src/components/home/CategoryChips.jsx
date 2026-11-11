import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { HOME_COLORS, HOME_FONTS, scale } from './homeTheme';

const TINTS = [
  ['#1B4B6E', '#123C5C'],
  ['#204F6B', '#123C5C'],
  ['#1A4560', '#0F3550'],
  ['#22506E', '#143E5E'],
  ['#1E4A66', '#123C5C'],
  ['#1C4762', '#0F3653'],
];

/** Pick a glyph for a free-text cuisine/category name. */
function iconFor(name = '') {
  const n = name.toLowerCase();
  if (n.includes('all')) return 'silverware-variant';
  if (n.includes('biry')) return 'rice';
  if (n.includes('pizza') || n.includes('ital')) return 'pizza';
  if (n.includes('coffee') || n.includes('cafe') || n.includes('café')) return 'coffee';
  if (n.includes('dessert') || n.includes('cake') || n.includes('bake') || n.includes('ice')) return 'cupcake';
  if (n.includes('chin') || n.includes('noodle') || n.includes('asian')) return 'noodles';
  if (n.includes('south')) return 'bowl-mix';
  if (n.includes('north') || n.includes('mughl') || n.includes('punjab')) return 'bowl-mix';
  if (n.includes('burger') || n.includes('fast')) return 'hamburger';
  if (n.includes('bbq') || n.includes('grill') || n.includes('tandoor')) return 'grill';
  if (n.includes('sea') || n.includes('fish')) return 'fish';
  if (n.includes('veg')) return 'leaf';
  return 'silverware-fork-knife';
}

const FALLBACK = ['All', 'Indian', 'Chinese', 'Italian', 'Biryani', 'South Indian', 'Cafe', 'Desserts', 'Fast Food'];

/**
 * Horizontal rail of category chips. `data` is a list of names (strings)
 * or { id, label }. "All" is always first. Selecting one filters the feed.
 */
export default function CategoryChips({ data, active = 'all', onChange }) {
  const raw = (data && data.length ? data : FALLBACK).map((c) =>
    typeof c === 'string' ? { id: c.toLowerCase().replace(/\s+/g, ''), label: c } : c
  );
  const items = raw.some((c) => c.id === 'all')
    ? raw
    : [{ id: 'all', label: 'All' }, ...raw];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {items.map((c, i) => {
        const on = c.id === active;
        return (
          <Pressable key={c.id} style={styles.item} onPress={() => onChange && onChange(c.id, c.label)}>
            <LinearGradient
              colors={TINTS[i % TINTS.length]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.tile, on && styles.tileActive]}
            >
              <MaterialCommunityIcons name={iconFor(c.label)} size={scale(25)} color={HOME_COLORS.gold} />
            </LinearGradient>
            <Text style={[styles.label, on && styles.labelActive]} numberOfLines={1}>{c.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: scale(16),
    paddingHorizontal: scale(20),
    paddingTop: scale(20),
    paddingBottom: scale(4),
  },
  item: { alignItems: 'center', width: scale(66) },
  tile: {
    width: scale(62),
    height: scale(62),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileActive: { borderWidth: 2, borderColor: HOME_COLORS.gold },
  label: {
    marginTop: scale(6),
    fontSize: scale(11),
    fontFamily: HOME_FONTS.semiBold,
    fontWeight: '600',
    color: HOME_COLORS.primaryText,
  },
  labelActive: { color: HOME_COLORS.gold, fontFamily: HOME_FONTS.bold, fontWeight: '700' },
});
