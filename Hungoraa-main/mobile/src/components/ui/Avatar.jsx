import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { COLOR, FONT } from '../../theme';

export default function Avatar({ uri, name = '', size = 40, style }) {
  const src = typeof uri === 'string' ? uri : uri?.uri || uri?.url;
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {src ? (
        <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLOR.wine,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: { fontFamily: FONT.semiBold, color: '#FFFFFF' },
});
