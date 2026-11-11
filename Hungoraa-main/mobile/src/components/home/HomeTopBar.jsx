import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { HOME_COLORS, HOME_FONTS, scale } from './homeTheme';

/**
 * Top row of the redesigned home screen (sits on the immersive world):
 *  - gold kicker + selected location + sub-line
 *  - notification bell with a live unread badge
 *  - user avatar (photo from backend, else gradient initial)
 */
export default function HomeTopBar({
  kicker = 'DINING NEAR YOU',
  location = 'Select location',
  sub = 'Tap to choose your city',
  initial = 'U',
  avatarUrl = null,
  unreadCount = 0,
  onPressLocation,
  onPressBell,
  onPressAvatar,
}) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.left} onPress={onPressLocation}>
        <View style={styles.kickerRow}>
          <Ionicons name="location" size={scale(13)} color={HOME_COLORS.gold} />
          <Text style={styles.kicker}>{kicker}</Text>
        </View>
        <View style={styles.locRow}>
          <Text style={styles.location} numberOfLines={1}>{location}</Text>
          <Ionicons name="chevron-down" size={scale(16)} color={HOME_COLORS.rose} />
        </View>
        <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
      </Pressable>

      <View style={styles.right}>
        <Pressable style={styles.iconBtn} onPress={onPressBell} hitSlop={8}>
          <Ionicons name="notifications-outline" size={scale(19)} color="#F3C6DF" />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable onPress={onPressAvatar} hitSlop={6}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={['#FF8A3D', '#FF3D6F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{initial}</Text>
            </LinearGradient>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: scale(20),
  },
  left: { flex: 1, paddingRight: scale(12) },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: scale(5) },
  kicker: {
    color: HOME_COLORS.gold,
    fontSize: scale(11),
    letterSpacing: 1.2,
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
  },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: scale(5), marginTop: scale(4) },
  location: {
    color: HOME_COLORS.white,
    fontSize: scale(22),
    fontFamily: HOME_FONTS.extraBold,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sub: {
    marginTop: scale(2),
    color: '#C8A9BE',
    fontSize: scale(12),
    fontFamily: HOME_FONTS.regular,
  },
  right: { flexDirection: 'row', gap: scale(10) },
  iconBtn: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: scale(4),
    right: scale(4),
    minWidth: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    paddingHorizontal: scale(3),
    backgroundColor: '#FF3D6F',
    borderWidth: 1.5,
    borderColor: '#2A001B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: scale(9),
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
  },
  avatar: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: HOME_COLORS.white,
    fontSize: scale(15),
    fontFamily: HOME_FONTS.bold,
    fontWeight: '700',
  },
});
