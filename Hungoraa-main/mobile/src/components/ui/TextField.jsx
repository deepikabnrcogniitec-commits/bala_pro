import React, { useState, forwardRef } from 'react';
import { View, TextInput, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLOR, RADII, SPACING, text, FONT } from '../../theme';

/** Sunken input with icon slot, focus ring + error line. */
const TextField = forwardRef(function TextField(
  { label, icon, rightIcon, onPressRightIcon, error, style, containerStyle, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.group, containerStyle]}>
      {label ? <Text style={[text.captionStrong, styles.label]}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={focused ? COLOR.terracotta : COLOR.inkFaint} style={styles.iconL} /> : null}
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={COLOR.inkFaint}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          {...props}
        />
        {rightIcon ? (
          <Pressable onPress={onPressRightIcon} hitSlop={8}>
            <Ionicons name={rightIcon} size={18} color={COLOR.inkFaint} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  group: { gap: 6 },
  label: { marginLeft: 2 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: RADII.sm,
    backgroundColor: COLOR.sunken,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: SPACING.md,
  },
  fieldFocused: { borderColor: COLOR.terracotta, backgroundColor: COLOR.surface },
  fieldError: { borderColor: COLOR.error },
  iconL: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: FONT.regular,
    fontSize: 15,
    color: COLOR.ink,
    paddingVertical: 12,
  },
  errorText: {
    fontFamily: FONT.medium,
    fontSize: 12,
    color: COLOR.error,
    marginLeft: 2,
  },
});

export default TextField;
