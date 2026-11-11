import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useCities } from '../../hooks/useHome';
import { HOME_COLORS, HOME_FONTS, scale } from './homeTheme';

/**
 * City / location picker. Uses device GPS reverse-geocode for "current
 * location" and a live list of cities that actually have restaurants.
 */
export default function LocationSheet({ visible, current, onClose, onSelect }) {
  const { data: cities = [], isLoading, isError, refetch } = useCities();
  const [locating, setLocating] = useState(false);

  const useCurrent = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Location permission denied' });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(pos.coords);
      const city = place?.city || place?.subregion || place?.region;
      if (city) {
        onSelect(city);
        onClose();
      } else {
        Toast.show({ type: 'error', text1: 'Could not detect your city' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Location unavailable', text2: e?.message });
    } finally {
      setLocating(false);
    }
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={styles.modal}
      useNativeDriver
    >
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <Text style={styles.heading}>Choose your location</Text>

        <Pressable style={styles.current} onPress={useCurrent} disabled={locating}>
          {locating
            ? <ActivityIndicator size="small" color={HOME_COLORS.orange} />
            : <Ionicons name="navigate" size={scale(18)} color={HOME_COLORS.orange} />}
          <Text style={styles.currentText}>Use my current location</Text>
        </Pressable>

        <Text style={styles.label}>Cities on Hungora</Text>

        {isLoading ? (
          <ActivityIndicator style={{ marginVertical: scale(24) }} color={HOME_COLORS.orange} />
        ) : isError ? (
          <Pressable style={styles.retry} onPress={refetch}>
            <Text style={styles.retryText}>Couldn’t load cities · Retry</Text>
          </Pressable>
        ) : (
          <ScrollView style={{ maxHeight: scale(280) }} showsVerticalScrollIndicator={false}>
            {['All cities', ...cities].map((c) => {
              const value = c === 'All cities' ? null : c;
              const active = (current || null) === value;
              return (
                <Pressable
                  key={c}
                  style={styles.row}
                  onPress={() => { onSelect(value); onClose(); }}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={scale(18)}
                    color={active ? HOME_COLORS.orange : '#8AA0B2'}
                  />
                  <Text style={[styles.rowText, active && styles.rowTextActive]}>{c}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: {
    backgroundColor: HOME_COLORS.sheetSurface,
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    padding: scale(20),
    paddingBottom: scale(32),
  },
  grabber: {
    alignSelf: 'center',
    width: scale(44),
    height: scale(5),
    borderRadius: scale(3),
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: scale(16),
  },
  heading: {
    fontSize: scale(18),
    fontFamily: HOME_FONTS.extraBold,
    fontWeight: '800',
    color: HOME_COLORS.sheetInk,
  },
  current: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingVertical: scale(14),
    marginTop: scale(12),
    paddingHorizontal: scale(14),
    borderRadius: scale(14),
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  currentText: {
    fontSize: scale(14),
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
    color: HOME_COLORS.orange,
  },
  label: {
    fontSize: scale(12),
    fontFamily: HOME_FONTS.semiBold,
    fontWeight: '600',
    color: HOME_COLORS.mutedInk,
    marginTop: scale(20),
    marginBottom: scale(6),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    paddingVertical: scale(13),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  rowText: {
    fontSize: scale(14),
    fontFamily: HOME_FONTS.medium,
    color: HOME_COLORS.sheetInk,
  },
  rowTextActive: {
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
    color: HOME_COLORS.orange,
  },
  retry: { paddingVertical: scale(20), alignItems: 'center' },
  retryText: { color: HOME_COLORS.orange, fontFamily: HOME_FONTS.semiBold, fontWeight: '600' },
});
