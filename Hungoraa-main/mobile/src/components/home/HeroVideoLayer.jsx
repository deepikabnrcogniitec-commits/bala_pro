import React from 'react';
import { StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

// Looping, muted background video. Only imported when the ExpoVideo native
// module is present in the binary (see HomeHeroVideo).
export default function HeroVideoLayer({ uri }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
    />
  );
}
