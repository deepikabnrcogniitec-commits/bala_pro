import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { restaurantApi } from '../../api/restaurant.api';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants';

const { width, height } = Dimensions.get('window');

// Conditionally import MapView — requires native module
let MapView, Marker, PROVIDER_GOOGLE;
try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
} catch {
  MapView = null;
}


export default function MapViewScreen({ navigation, route }) {
  const [location, setLocation] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to show nearby restaurants.');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc.coords);
      setLoading(false);
    })();
  }, []);

  const { data } = useQuery({
    queryKey: ['nearby-map', location?.latitude, location?.longitude],
    queryFn: () => restaurantApi.getNearby({ lat: location.latitude, lng: location.longitude, radius: 5 }),
    enabled: !!location,
  });

  const restaurants = data?.data?.data?.restaurants || [];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nearby Map</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Fallback if react-native-maps not available
  if (!MapView) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nearby Restaurants</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🗺️</Text>
          <Text style={styles.loadingText}>Map view requires react-native-maps</Text>
          <Text style={{ color: '#6F6862', fontSize: 13, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 }}>
            Run: expo install react-native-maps
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const region = location
    ? {
        latitude: location.latitude, longitude: location.longitude,
        latitudeDelta: 0.05, longitudeDelta: 0.05,
      }
    : {
        latitude: 12.9716, longitude: 77.5946,
        latitudeDelta: 0.05, longitudeDelta: 0.05,
      };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nearby Restaurants</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1 }}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton
        >
          {restaurants.map((r) => {
            const [lng, lat] = r.location?.coordinates || [77.5946, 12.9716];
            return (
              <Marker
                key={r._id}
                coordinate={{ latitude: lat, longitude: lng }}
                title={r.name}
                description={`⭐ ${r.averageRating?.toFixed(1)}`}
                pinColor={COLORS.primary}
                onPress={() => setSelected(r)}
              />
            );
          })}
        </MapView>

        {/* Bottom Card */}
        {selected && (
          <View style={styles.bottomCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedName}>{selected.name}</Text>
              <Text style={styles.selectedRating}>⭐ {selected.averageRating?.toFixed(1)}</Text>
            </View>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => {
                setSelected(null);
                navigation.navigate('RestaurantDetail', { id: selected._id });
              }}
            >
              <Text style={styles.viewBtnText}>View →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F1' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EAE2D6',
  },
  backBtn: { padding: 8 },
  backText: { fontSize: 22, color: COLORS.primary },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B18' },
  loadingText: { color: '#6F6862', marginTop: 12, fontSize: 14 },
  bottomCard: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.lg, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  selectedName: { fontSize: 16, fontWeight: '700', color: '#1E1B18' },
  selectedRating: { fontSize: 13, color: '#C8952B', marginTop: 4 },
  viewBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  viewBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
