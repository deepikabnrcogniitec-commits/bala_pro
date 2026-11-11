import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

// `expo-video`'s native module ("ExpoVideo") only exists in a dev/production
// build that bundled it — not in Expo Go. Import the video layer lazily so a
// missing module can't crash the home screen; fall back to the poster image.
let VideoLayer = null;
try {
  // eslint-disable-next-line global-require
  const { requireOptionalNativeModule } = require('expo-modules-core');
  if (requireOptionalNativeModule?.('ExpoVideo')) {
    // eslint-disable-next-line global-require
    VideoLayer = require('./HeroVideoLayer').default;
  }
} catch (e) {
  VideoLayer = null;
}

export default function HomeHeroVideo({ uri, poster }) {
  if (VideoLayer && uri) return <VideoLayer uri={uri} />;
  if (poster) {
    return (
      <ExpoImage source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" allowDownscaling={false} priority="high" transition={250} />
    );
  }
  return <View />;
}
