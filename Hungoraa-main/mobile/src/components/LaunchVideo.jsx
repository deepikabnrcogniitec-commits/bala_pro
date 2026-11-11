import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, StatusBar, useWindowDimensions } from 'react-native';

// 1080×1920 (9:16), ~4s, flat navy background.
const INTRO = require('../../assets/hungora-splash-premium.mp4');
const VIDEO_RATIO = 1920 / 1080;
const VIDEO_BG = '#0B2C4D'; // the video's own background — letterbox bars blend in seamlessly

// The logo/wordmark sits inside the middle ~76% of the frame width, so on tall
// phones (up to ~9:22) we can fill the screen with `cover` and only trim empty
// navy from the sides. Anything wider than 9:16 (tablets, foldables, landscape)
// or taller than that uses `contain`, so nothing is ever cut off.
const MAX_COVER_RATIO = 2.25;

function fitFor(width, height) {
  const ratio = height / width;
  return ratio >= VIDEO_RATIO && ratio <= MAX_COVER_RATIO ? 'cover' : 'contain';
}

// Hard stop so a stalled/undecodable video can never trap the user on the intro.
const MAX_MS = 8000;

// `expo-video` needs its native module (dev/production build, not Expo Go).
// Without it we skip the intro instead of crashing.
let VideoView = null;
let useVideoPlayer = null;
try {
  // eslint-disable-next-line global-require
  const { requireOptionalNativeModule } = require('expo-modules-core');
  if (requireOptionalNativeModule?.('ExpoVideo')) {
    // eslint-disable-next-line global-require
    ({ VideoView, useVideoPlayer } = require('expo-video'));
  }
} catch (e) {
  VideoView = null;
}

/**
 * Full-screen logo-reveal video shown once per app launch, over the app.
 * `onFirstFrame` fires when the video is on screen (hide the native splash then,
 * so there's no blank flash); `onDone` fires after it has faded out.
 */
export default function LaunchVideo({ onFirstFrame, onDone }) {
  if (!VideoView) return <SkipIntro onFirstFrame={onFirstFrame} onDone={onDone} />;
  return <IntroPlayer onFirstFrame={onFirstFrame} onDone={onDone} />;
}

function SkipIntro({ onFirstFrame, onDone }) {
  useEffect(() => {
    onFirstFrame?.();
    onDone?.();
  }, []);
  return null;
}

function IntroPlayer({ onFirstFrame, onDone }) {
  const { width, height } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(1)).current;
  const [finishing, setFinishing] = useState(false);
  const shownRef = useRef(false);

  const player = useVideoPlayer(INTRO, (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  const reveal = useCallback(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    onFirstFrame?.();
  }, [onFirstFrame]);

  const finish = useCallback(() => setFinishing(true), []);

  useEffect(() => {
    const endSub = player.addListener('playToEnd', finish);
    const statusSub = player.addListener('statusChange', ({ status }) => {
      if (status === 'error') {
        reveal();
        finish();
      }
    });
    const guard = setTimeout(() => {
      reveal();
      finish();
    }, MAX_MS);
    return () => {
      endSub.remove();
      statusSub.remove();
      clearTimeout(guard);
    };
  }, [player]);

  useEffect(() => {
    if (!finishing) return;
    Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => onDone?.());
  }, [finishing]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, { opacity }]}>
      <StatusBar hidden />
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={fitFor(width, height)}
        nativeControls={false}
        onFirstFrameRender={reveal}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 999, elevation: 999, backgroundColor: VIDEO_BG },
});
