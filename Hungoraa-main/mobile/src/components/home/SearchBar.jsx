import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HOME_COLORS, HOME_FONTS, scale } from './homeTheme';

/**
 * Glassy search row on the immersive world.
 *  - Left: elevated white pill with search text + mic
 *  - Right: square VEG filter with a small toggle
 */
export default function SearchBar({
  placeholder = 'Restaurants, cuisines, a dish…',
  vegOnly = false,
  onToggleVeg,
  onPress,
  onPressMic,
}) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.searchBar} onPress={onPress}>
        <Ionicons name="search" size={scale(19)} color={HOME_COLORS.mutedInk} />
        <Text style={styles.placeholder} numberOfLines={1}>{placeholder}</Text>
        <View style={styles.separator} />
        <Pressable onPress={onPressMic} hitSlop={8}>
          <Ionicons name="mic" size={scale(19)} color={HOME_COLORS.orange} />
        </Pressable>
      </Pressable>

      <Pressable style={styles.vegBtn} onPress={onToggleVeg}>
        <Text style={styles.vegText}>VEG</Text>
        <View style={[styles.track, vegOnly && styles.trackActive]}>
          <View style={[styles.knob, vegOnly ? styles.knobActive : styles.knobInactive]} />
        </View>
      </Pressable>
    </View>
  );
}

const BAR_H = scale(52);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingHorizontal: scale(20),
  },
  searchBar: {
    flex: 1,
    height: BAR_H,
    borderRadius: scale(16),
    backgroundColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    gap: scale(10),
    shadowColor: '#0A0006',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 26,
    elevation: 8,
  },
  placeholder: {
    flex: 1,
    fontSize: scale(14),
    fontFamily: HOME_FONTS.medium,
    color: HOME_COLORS.mutedInk,
  },
  separator: {
    width: 1,
    height: scale(22),
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  vegBtn: {
    width: BAR_H,
    height: BAR_H,
    borderRadius: scale(16),
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(4),
    shadowColor: '#0A0006',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 26,
    elevation: 8,
  },
  vegText: {
    fontSize: scale(12),
    fontFamily: HOME_FONTS.extraBold,
    fontWeight: '800',
    color: HOME_COLORS.primaryText,
  },
  track: {
    width: scale(26),
    height: scale(13),
    borderRadius: scale(7),
    backgroundColor: 'rgba(255,255,255,0.20)',
    justifyContent: 'center',
    padding: scale(2),
  },
  trackActive: { backgroundColor: '#BFE3D3' },
  knob: {
    width: scale(9),
    height: scale(9),
    borderRadius: scale(3),
    borderWidth: 2,
  },
  knobInactive: {
    borderColor: '#AFC2D2',
    backgroundColor: '#EAF1F8',
    alignSelf: 'flex-start',
  },
  knobActive: {
    borderColor: HOME_COLORS.green,
    backgroundColor: HOME_COLORS.white,
    alignSelf: 'flex-end',
  },
});
