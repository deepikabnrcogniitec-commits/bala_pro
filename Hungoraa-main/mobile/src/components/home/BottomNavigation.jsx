import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLOR, SPACING, RADII, ELEVATION, GRADIENT, FONT } from '../../theme';
import PulseGlow from './PulseGlow';

const LEFT = [
  { id: 'dineout', label: 'Dine Out', lib: 'mc', icon: 'silverware-fork-knife' },
  { id: 'quick', label: 'Quick', lib: 'ion', icon: 'flash-outline' },
];
const RIGHT = [
  { id: 'offers', label: 'Offers', lib: 'ion', icon: 'pricetag-outline' },
  { id: 'bookings', label: 'Bookings', lib: 'ion', icon: 'calendar-outline' },
];

function TabIcon({ lib, icon, color, size }) {
  if (lib === 'mc') return <MaterialCommunityIcons name={icon} size={size} color={color} />;
  return <Ionicons name={icon} size={size} color={color} />;
}

function Item({ item, active, onChange }) {
  const on = item.id === active;
  const color = on ? COLOR.blue : COLOR.inkFaint;
  return (
    <Pressable style={styles.item} onPress={() => onChange && onChange(item.id)}>
      <TabIcon lib={item.lib} icon={item.icon} color={color} size={22} />
      <Text style={[styles.label, { color, fontFamily: on ? FONT.semiBold : FONT.medium }]}>
        {item.label}
      </Text>
    </Pressable>
  );
}

/**
 * Floating rounded bottom nav — white pill, blue active state, with a raised
 * colour-filled "Pay Bill" action in the centre.
 */
export default function BottomNavigation({ active = 'dineout', onChange, bottomInset = 0 }) {
  return (
    <View style={[styles.wrap, { paddingBottom: bottomInset ? bottomInset - 4 : 8 }]}>
      <View style={[styles.bar, ELEVATION.lg]}>
        {LEFT.map((item) => <Item key={item.id} item={item} active={active} onChange={onChange} />)}

        <Pressable style={styles.centerItem} onPress={() => onChange && onChange('paybill')}>
          <View style={styles.centerCircleWrap}>
            <PulseGlow color={COLOR.blue} size={52} />
            <PulseGlow color={COLOR.blue} size={52} delay={900} />
            <LinearGradient
              colors={GRADIENT.blue}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.centerCircle}
            >
              <Ionicons name="receipt-outline" size={24} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <Text style={styles.centerLabel}>Pay Bill</Text>
        </Pressable>

        {RIGHT.map((item) => <Item key={item.id} item={item} active={active} onChange={onChange} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: SPACING.md },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADII.lg,
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.hairline,
    overflow: 'visible',
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontSize: 10 },
  centerItem: { flex: 1, alignItems: 'center' },
  centerCircleWrap: {
    width: 52,
    height: 52,
    marginTop: -24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: COLOR.surface,
    shadowColor: COLOR.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  centerLabel: { fontSize: 10, fontFamily: FONT.semiBold, color: COLOR.blue, marginTop: 2 },
});
