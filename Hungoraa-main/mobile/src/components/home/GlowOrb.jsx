import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Soft ambient light orb used to add atmospheric depth behind sections.
 * Pure view + gradient (no blur module) so it stays cheap on Android:
 * three concentric fading rings fake a radial glow.
 */
export default function GlowOrb({
  size = 260,
  colors = ['rgba(255,90,0,0.45)', 'rgba(255,90,0,0)'],
  style,
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          opacity: 0.9,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2 }}
      />
      <LinearGradient
        colors={colors}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 0, y: 0 }}
        style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2 }}
      />
    </View>
  );
}
