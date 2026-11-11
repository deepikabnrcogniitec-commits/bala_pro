import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLOR, GRADIENT } from '../../theme';

const BLURHASH = 'L6Pj0^i_.AyE_3t7t7R**0o#DgR4';

/**
 * Food photography with a warm placeholder + optional bottom scrim so
 * overlaid text stays legible. `uri` may be a string or {uri}.
 */
export default function PhotoImage({
  uri,
  style,
  radius = 0,
  scrim = false,
  scrimHeight = '55%',
  contentFit = 'cover',
  fallbackIcon = 'restaurant',
  children,
}) {
  const src = typeof uri === 'string' ? uri : uri?.uri || uri?.url;

  return (
    <View style={[styles.wrap, { borderRadius: radius }, style]}>
      {src ? (
        <Image
          source={{ uri: src }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          placeholder={{ blurhash: BLURHASH }}
          transition={220}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Ionicons name={`${fallbackIcon}-outline`} size={34} color={COLOR.inkFaint} />
        </View>
      )}

      {scrim ? (
        <LinearGradient
          colors={GRADIENT.scrimDown}
          style={[styles.scrim, { height: scrimHeight }]}
          pointerEvents="none"
        />
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: COLOR.sunken },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLOR.surfaceAlt },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
