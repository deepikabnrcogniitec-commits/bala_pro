import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLOR, SPACING, RADII, text } from '../../theme';
import Button from './Button';

/** Centred empty / error state — icon badge, title, body, optional CTA. */
export default function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
  actionLabel,
  onAction,
  tone = 'neutral',
  dark = false,
  style,
}) {
  const accent = tone === 'error' ? COLOR.error : COLOR.terracotta;
  const badgeBg = dark
    ? COLOR.onNavyFill
    : tone === 'error' ? COLOR.errorTint : COLOR.terracottaTint;
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
        <Ionicons name={icon} size={26} color={dark ? COLOR.onNavy : accent} />
      </View>
      {title ? <Text style={[text.h3, styles.title, dark && { color: COLOR.onNavy }]}>{title}</Text> : null}
      {message ? <Text style={[text.body, styles.msg, dark && { color: COLOR.onNavySoft }]}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} size="md" full={false} style={styles.cta} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xxl, paddingHorizontal: SPACING.xl },
  badge: {
    width: 60, height: 60, borderRadius: RADII.lg,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
  },
  title: { textAlign: 'center' },
  msg: { textAlign: 'center', marginTop: 6, maxWidth: 280 },
  cta: { marginTop: SPACING.lg },
});
