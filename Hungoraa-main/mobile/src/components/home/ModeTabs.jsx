import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HOME_COLORS, HOME_FONTS, scale } from './homeTheme';

const TABS = [
  { id: 'dineout', label: 'Dine Out', icon: 'silverware-fork-knife' },
  { id: 'paybill', label: 'Pay Bill', icon: 'credit-card-outline' },
  { id: 'events', label: 'Events', icon: 'calendar-blank-outline' },
];

/**
 * Underlined text tabs on the immersive world — Dine Out / Pay Bill / Events.
 * The active tab carries a gold underline.
 */
export default function ModeTabs({ active = 'dineout', onChange }) {
  return (
    <View style={styles.row}>
      {TABS.map((t) => {
        const on = t.id === active;
        return (
          <Pressable
            key={t.id}
            style={styles.tab}
            onPress={() => onChange && onChange(t.id)}
          >
            <MaterialCommunityIcons
              name={t.icon}
              size={scale(17)}
              color={on ? '#fff' : '#C9A9BD'}
            />
            <Text style={[styles.label, { color: on ? '#fff' : '#C9A9BD', fontWeight: on ? '700' : '600' }]}>
              {t.label}
            </Text>
            {on && <View style={styles.underline} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: scale(26),
    paddingHorizontal: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(7),
    paddingBottom: scale(12),
  },
  label: {
    fontSize: scale(14),
    fontFamily: HOME_FONTS.bold,
  },
  underline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: scale(3),
    borderRadius: scale(2),
    backgroundColor: HOME_COLORS.gold,
  },
});
