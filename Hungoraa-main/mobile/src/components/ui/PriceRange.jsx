import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { COLOR, FONT } from '../../theme';

/** ₹ glyphs — filled up to `level` (1–4). */
export default function PriceRange({ level = 2, perTwo, style }) {
  const n = Math.max(1, Math.min(4, level));
  if (perTwo) {
    return <Text style={[styles.text, style]}>{`₹${Number(perTwo).toLocaleString('en-IN')} for two`}</Text>;
  }
  return (
    <Text style={[styles.text, style]}>
      <Text style={styles.on}>{'₹'.repeat(n)}</Text>
      <Text style={styles.off}>{'₹'.repeat(4 - n)}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: FONT.medium, fontSize: 13, color: COLOR.inkSoft },
  on: { color: COLOR.ink },
  off: { color: COLOR.inkFaint },
});
