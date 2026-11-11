import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLOR } from '../../theme';

/** Circular icon button. variant: 'plain' | 'surface' | 'glass' (on photos) */
export default function IconButton({ icon, onPress, size = 22, variant = 'plain', color, style }) {
  const v = VARIANTS[variant] || VARIANTS.plain;
  return (
    <Pressable onPress={onPress} hitSlop={8} style={[styles.btn, v.container, style]}>
      <Ionicons name={icon} size={size} color={color || v.color} />
    </Pressable>
  );
}

const VARIANTS = {
  plain: { container: {}, color: COLOR.ink },
  surface: { container: { backgroundColor: COLOR.surface }, color: COLOR.ink },
  glass: { container: { backgroundColor: 'rgba(8,15,25,0.34)' }, color: '#FFFFFF' },
};

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
