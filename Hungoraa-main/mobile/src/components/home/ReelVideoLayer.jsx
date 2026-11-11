import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

/**
 * The actual video surface for a reel card. Rendered ONLY when the
 * `expo-video` native module is present in the running binary
 * (see the guard in FoodReelCard) — otherwise the poster + Ken Burns
 * pan stands in, so the screen works on a build without a rebuild.
 */
export default function ReelVideoLayer({ uri, isActive }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    if (!player) return;
    try {
      if (isActive) player.play();
      else player.pause();
    } catch (e) {
      /* player released during fast scroll — safe to ignore */
    }
  }, [isActive, player]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        surfaceType="textureView"
      />
    </View>
  );
}
