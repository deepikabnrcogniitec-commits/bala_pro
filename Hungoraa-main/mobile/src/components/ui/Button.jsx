import React from 'react';
import { Text, StyleSheet, Pressable, ActivityIndicator, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLOR, RADII, SPACING, MOTION, text } from '../../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * variant: 'primary' (terracotta fill) | 'secondary' (wine outline) |
 *          'ghost' (text only) | 'light' (white fill)
 * size: 'lg' (default) | 'md' | 'sm'
 */
export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  full = true,
  style,
}) {
  const press = useSharedValue(0);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(press.value ? 0.97 : 1, MOTION.spring) }],
  }));

  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.lg;
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={() => { press.value = 1; }}
      onPressOut={() => { press.value = 0; }}
      style={[
        styles.base,
        { height: s.height, borderRadius: s.radius, paddingHorizontal: s.padX },
        v.container,
        full && styles.full,
        isDisabled && styles.disabled,
        aStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={s.icon} color={v.text.color} style={styles.iconL} /> : null}
          <Text style={[text.button, v.text, { fontSize: s.font }]}>{label}</Text>
          {iconRight ? <Ionicons name={iconRight} size={s.icon} color={v.text.color} style={styles.iconR} /> : null}
        </View>
      )}
    </AnimatedPressable>
  );
}

const VARIANTS = {
  primary: {
    container: { backgroundColor: COLOR.terracotta },
    text: { color: COLOR.onColor },
  },
  secondary: {
    container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLOR.wine },
    text: { color: COLOR.wine },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: COLOR.terracotta },
  },
  light: {
    container: { backgroundColor: COLOR.surface },
    text: { color: COLOR.ink },
  },
};

const SIZES = {
  lg: { height: 54, radius: RADII.md, padX: SPACING.xl, font: 15, icon: 18 },
  md: { height: 46, radius: RADII.sm, padX: SPACING.lg, font: 14, icon: 16 },
  sm: { height: 38, radius: RADII.pill, padX: SPACING.md, font: 13, icon: 15 },
};

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  full: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconL: { marginRight: 8 },
  iconR: { marginLeft: 8 },
  disabled: { opacity: 0.45 },
});
