import { Image, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Centred Hungora masthead — the background-removed wordmark logo, flanked
 * by fading gold hairlines. Eases in once on mount.
 */
export default function Brandmark({ style }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(620).springify().damping(16)}
      style={[styles.row, style]}
    >
      <LinearGradient
        colors={['transparent', 'rgba(249,169,27,0.6)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.rule}
      />

      <Image
        source={require('../../assets/bg-remove -logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Hungora"
      />

      <LinearGradient
        colors={['rgba(249,169,27,0.6)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.rule}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 6,
    paddingBottom: 12,
  },
  rule: {
    height: 1.5,
    width: 30,
    borderRadius: 1,
  },
  logo: {
    width: 150,
    height: 26,
  },
});
