import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLOR, RADII, SPACING, FONT } from '../../theme';

/** Filter / selection pill. Selected = terracotta wash + border. */
export default function Chip({ label, selected = false, onPress, icon, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipOn : styles.chipOff, style]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? COLOR.terracotta : COLOR.inkSoft}
          style={styles.icon}
        />
      ) : null}
      <Text style={[styles.label, selected ? styles.labelOn : styles.labelOff]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  chipOff: { backgroundColor: COLOR.surface, borderColor: COLOR.border },
  chipOn: { backgroundColor: COLOR.terracottaTint, borderColor: COLOR.terracotta },
  icon: { marginRight: 6 },
  label: { fontFamily: FONT.semiBold, fontSize: 13 },
  labelOff: { color: COLOR.inkSoft },
  labelOn: { color: COLOR.terracottaPressed },
});
