import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLOR, SPACING, text } from '../../theme';

/**
 * Top bar with a back chevron + centred serif title. `variant`:
 *  - 'solid'       cream bar with hairline (default)
 *  - 'transparent' floats over a photo hero (light icons)
 */
export default function AppBar({
  title,
  onBack,
  right,
  variant = 'solid',
  style,
}) {
  const overPhoto = variant === 'transparent';
  const iconColor = overPhoto ? '#FFFFFF' : COLOR.ink;

  return (
    <View
      style={[
        styles.bar,
        overPhoto ? styles.transparent : styles.solid,
        style,
      ]}
    >
      <View style={styles.side}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10} style={[styles.iconBtn, overPhoto && styles.iconBtnGlass]}>
            <Ionicons name="chevron-back" size={22} color={iconColor} />
          </Pressable>
        ) : null}
      </View>

      {title ? (
        <Text numberOfLines={1} style={[text.h3, styles.title, overPhoto && styles.titleOnPhoto]}>
          {title}
        </Text>
      ) : (
        <View style={styles.flex} />
      )}

      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: SPACING.sm,
  },
  solid: {
    backgroundColor: COLOR.bg,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  side: { width: 44, alignItems: 'flex-start', justifyContent: 'center' },
  sideRight: { alignItems: 'flex-end' },
  flex: { flex: 1 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnGlass: {
    backgroundColor: 'rgba(8,15,25,0.32)',
  },
  title: { flex: 1, textAlign: 'center' },
  titleOnPhoto: { color: '#FFFFFF' },
});
