import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLOR, RADII, FONT } from '../../theme';

const TONES = {
  neutral: { bg: COLOR.surfaceAlt, fg: COLOR.inkSoft },
  terracotta: { bg: COLOR.terracottaTint, fg: COLOR.terracottaPressed },
  wine: { bg: COLOR.wineTint, fg: COLOR.wine },
  gold: { bg: COLOR.goldTint, fg: '#9A6E1C' },
  success: { bg: COLOR.successTint, fg: COLOR.success },
  warning: { bg: COLOR.warningTint, fg: '#9A5B1C' },
  error: { bg: COLOR.errorTint, fg: COLOR.error },
};

/** Small status / label pill. */
export default function Tag({ label, tone = 'neutral', icon, style }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={t.fg} style={styles.icon} /> : null}
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.xs,
  },
  icon: { marginRight: 4 },
  label: { fontFamily: FONT.semiBold, fontSize: 11, letterSpacing: 0.2 },
});
