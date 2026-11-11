import React from 'react';
import { View } from 'react-native';
import { COLOR, SPACING } from '../../theme';

export default function Divider({ inset = 0, spacing = SPACING.md, style }) {
  return (
    <View
      style={[
        { height: 1, backgroundColor: COLOR.hairline, marginHorizontal: inset, marginVertical: spacing },
        style,
      ]}
    />
  );
}
