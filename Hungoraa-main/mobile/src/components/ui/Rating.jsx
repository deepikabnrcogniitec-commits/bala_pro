import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLOR, FONT } from '../../theme';

/**
 * Rating pill — filled star + number. `variant`:
 *  - 'plain'  gold star + ink number (on light)
 *  - 'solid'  green chip (on photos)
 */
export default function Rating({ value, count, variant = 'plain', size = 13, style }) {
  if (value == null) return null;
  const n = Number(value).toFixed(1);

  if (variant === 'solid') {
    return (
      <View style={[styles.solid, style]}>
        <Ionicons name="star" size={size - 2} color="#FFFFFF" />
        <Text style={styles.solidText}>{n}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, style]}>
      <Ionicons name="star" size={size} color={COLOR.gold} />
      <Text style={[styles.plainText, { fontSize: size }]}>{n}</Text>
      {count != null ? <Text style={styles.count}>({count})</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  plainText: { fontFamily: FONT.semiBold, color: COLOR.ink },
  count: { fontFamily: FONT.regular, fontSize: 12, color: COLOR.inkFaint, marginLeft: 2 },
  solid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLOR.success,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  solidText: { fontFamily: FONT.bold, fontSize: 12, color: '#FFFFFF' },
});
