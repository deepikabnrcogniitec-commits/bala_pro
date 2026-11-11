import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLOR, SPACING, RADII, SCREEN_WIDTH, FONT } from '../../theme';
import PhotoImage from '../ui/PhotoImage';

/**
 * "What's on your mind?" discovery tiles. Each deep-links into a filtered
 * restaurant list, so browse stays data-driven.
 */
const MOODS = [
  { id: 'quick', label: 'Quick Bites', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=70', params: { sortBy: 'relevance', title: 'Quick Bites' } },
  { id: 'healthy', label: 'Healthy', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=70', params: { cuisine: 'Salad', title: 'Healthy Options' } },
  { id: 'latenight', label: 'Late Night', img: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=300&q=70', params: { title: 'Late Night Food' } },
  { id: 'desserts', label: 'Desserts', img: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&q=70', params: { cuisine: 'Desserts', title: 'Desserts' } },
  { id: 'family', label: 'Family Dining', img: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=300&q=70', params: { title: 'Family Dining' } },
  { id: 'romantic', label: 'Date Night', img: 'https://images.unsplash.com/photo-1529543544282-cf3a4b7d3b1a?w=300&q=70', params: { title: 'Romantic Dinner' } },
];

const TILE = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm * 2) / 3;

export default function DiscoveryGrid({ onOpen }) {
  return (
    <View style={styles.wrap}>
      {MOODS.map((m) => (
        <Pressable key={m.id} style={styles.tile} onPress={() => onOpen && onOpen(m.params)}>
          <PhotoImage uri={m.img} style={styles.img} radius={RADII.md} scrim scrimHeight="70%" />
          <Text style={styles.label} numberOfLines={1}>{m.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  tile: { width: TILE },
  img: { width: TILE, height: TILE, justifyContent: 'flex-end', padding: 8 },
  label: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    fontFamily: FONT.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
});
