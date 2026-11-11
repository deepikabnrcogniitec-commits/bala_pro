import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, ActivityIndicator, Linking, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { COLOR, SPACING, RADII, ELEVATION, FONT, text } from '../../theme';

/**
 * Swiggy-style location prompt shown right after login when we don't yet know
 * where the guest is. "Use current location" runs the OS permission flow, gets a
 * GPS fix and reverse-geocodes it to a city. "Enter manually" hands off to the
 * city picker.
 */
export default function LocationGate({ visible, onResolved, onManual, onClose }) {
  const [phase, setPhase] = useState('idle'); // idle | locating | blocked
  const [error, setError] = useState(null);

  const detect = async () => {
    setError(null);
    setPhase('locating');
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted' && perm.canAskAgain) {
        perm = await Location.requestForegroundPermissionsAsync();
      }
      if (perm.status !== 'granted') {
        setPhase(perm.canAskAgain ? 'idle' : 'blocked');
        if (perm.canAskAgain) setError('Permission needed to detect your location.');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };

      let city = null;
      let locality = null;
      try {
        const [place] = await Location.reverseGeocodeAsync(coords);
        if (place) {
          city = place.city || place.subregion || place.region || null;
          const area = place.district || place.name || place.street;
          locality = [area, city].filter(Boolean).join(', ') || city;
        }
      } catch { /* geocode is best-effort */ }

      onResolved({ city, coords, locality });
    } catch (e) {
      setPhase('idle');
      setError(e?.message || 'Could not get your location. Try again.');
    }
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') Linking.openURL('app-settings:');
    else Linking.openSettings();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={styles.iconWrap}>
            <Ionicons name="location" size={30} color={COLOR.gold} />
          </View>

          <Text style={[text.h2, styles.title]}>Where should we look for restaurants?</Text>
          <Text style={[text.body, styles.subtitle]}>
            Turn on location so Hungora can show places, offers and tables near you.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {phase === 'locating' ? (
            <View style={styles.locating}>
              <ActivityIndicator color={COLOR.navy} />
              <Text style={styles.locatingText}>Finding your location…</Text>
            </View>
          ) : phase === 'blocked' ? (
            <>
              <Text style={[text.caption, styles.blockedNote]}>
                Location access is turned off for Hungora. Enable it in Settings, or set your city manually.
              </Text>
              <Pressable style={styles.primary} onPress={openSettings}>
                <Ionicons name="settings-outline" size={17} color={COLOR.navy} />
                <Text style={styles.primaryText}>Open Settings</Text>
              </Pressable>
              <Pressable style={styles.secondary} onPress={onManual}>
                <Text style={styles.secondaryText}>Enter location manually</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.primary} onPress={detect}>
                <Ionicons name="navigate" size={17} color={COLOR.navy} />
                <Text style={styles.primaryText}>Use my current location</Text>
              </Pressable>
              <Pressable style={styles.secondary} onPress={onManual}>
                <Text style={styles.secondaryText}>Enter location manually</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(8,15,25,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLOR.surface,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl,
    alignItems: 'center',
    ...ELEVATION.lg,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLOR.border, marginBottom: SPACING.lg },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: COLOR.goldTint,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: SPACING.xs, marginBottom: SPACING.lg, paddingHorizontal: SPACING.sm },
  error: { fontFamily: FONT.medium, fontSize: 12, color: COLOR.error, marginBottom: SPACING.sm, textAlign: 'center' },
  blockedNote: { textAlign: 'center', marginBottom: SPACING.md, lineHeight: 18 },
  locating: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.lg },
  locatingText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLOR.ink },
  primary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    alignSelf: 'stretch', backgroundColor: COLOR.gold, borderRadius: RADII.pill, paddingVertical: 15,
  },
  primaryText: { fontFamily: FONT.bold, fontSize: 15, color: COLOR.navy, letterSpacing: 0.2 },
  secondary: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 14, marginTop: SPACING.xs },
  secondaryText: { fontFamily: FONT.semiBold, fontSize: 14, color: COLOR.inkSoft },
});
