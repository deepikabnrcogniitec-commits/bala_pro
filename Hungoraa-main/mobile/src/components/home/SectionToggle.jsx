import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { HOME_COLORS, HOME_FONTS, scale } from './homeTheme';

/**
 * Segmented control that sits directly below the promo banner.
 * "TOP RATED" (active) / "TABLE IN 15 MINS".
 */
export default function SectionToggle({ active = 'top', onChange }) {
  const tabs = [
    { id: 'top', label: 'TOP RATED' },
    { id: 'quick', label: 'TABLE IN 15 MINS' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <TouchableOpacity
            key={tab.id}
            activeOpacity={0.9}
            onPress={() => onChange && onChange(tab.id)}
            style={[styles.tab, isActive && styles.tabActive]}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: scale(30),
    marginTop: scale(20),
    height: scale(60),
    borderRadius: scale(18),
    backgroundColor: '#0A2A44',
    padding: scale(6),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(14),
  },
  tabActive: {
    backgroundColor: HOME_COLORS.sheetSurface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: scale(14),
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  labelActive: { color: '#D95F18' },
  labelInactive: { color: HOME_COLORS.secondaryText },
});
