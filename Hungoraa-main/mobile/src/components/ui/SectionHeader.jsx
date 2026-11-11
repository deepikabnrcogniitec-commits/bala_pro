import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLOR, SPACING, text } from '../../theme';

/** Serif section title with an optional "See all" link. */
export default function SectionHeader({ title, subtitle, actionLabel = 'See all', onAction, style }) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.flex}>
        <Text style={text.h2}>{title}</Text>
        {subtitle ? <Text style={[text.caption, styles.sub]}>{subtitle}</Text> : null}
      </View>
      {onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.action}>
          <Text style={text.link}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={COLOR.terracotta} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  flex: { flex: 1 },
  sub: { marginTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: SPACING.sm },
});
