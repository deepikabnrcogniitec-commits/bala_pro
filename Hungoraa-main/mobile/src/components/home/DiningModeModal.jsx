import React from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLOR, SPACING, RADII, ELEVATION, GRADIENT, FONT } from '../../theme';

/**
 * Centered popup shown once after login: the guest picks how they want to
 * dine — reserve a table ahead, or dine in now and pay the bill.
 */
export default function DiningModeModal({ visible, onSelect, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.card}>
          <Pressable style={styles.close} onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={20} color={COLOR.inkSoft} />
          </Pressable>

          <Text style={styles.title}>How would you like to dine?</Text>
          <Text style={styles.subtitle}>Pick one to get started — you can switch anytime.</Text>

          <View style={styles.options}>
            <OptionCard
              gradient={GRADIENT.blue}
              icon="calendar"
              label="Book a Table"
              hint="Reserve ahead for a date & time"
              onPress={() => onSelect('book')}
            />
            <OptionCard
              gradient={GRADIENT.gold}
              icon="restaurant"
              label="Dine In"
              hint="Walk in now & pay the bill"
              onPress={() => onSelect('dinein')}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function OptionCard({ gradient, icon, label, hint, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
      onPress={onPress}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.optionIcon}>
        <Ionicons name={icon} size={26} color="#FFFFFF" />
      </LinearGradient>
      <Text style={styles.optionLabel}>{label}</Text>
      <Text style={styles.optionHint}>{hint}</Text>
      <View style={styles.optionCta}>
        <Text style={styles.optionCtaText}>Choose</Text>
        <Ionicons name="arrow-forward" size={14} color={COLOR.blue} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12,47,78,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLOR.surface,
    borderRadius: RADII.xl,
    padding: SPACING.xl,
    ...ELEVATION.lg,
  },
  close: { position: 'absolute', top: SPACING.md, right: SPACING.md, zIndex: 2 },
  title: {
    fontFamily: FONT.display,
    fontSize: 22,
    color: COLOR.ink,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  subtitle: {
    fontFamily: FONT.regular,
    fontSize: 13,
    color: COLOR.inkSoft,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  options: { flexDirection: 'row', gap: SPACING.md },
  option: {
    flex: 1,
    backgroundColor: COLOR.surfaceAlt,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: COLOR.hairline,
    padding: SPACING.md,
    alignItems: 'center',
    ...ELEVATION.sm,
  },
  optionPressed: { transform: [{ scale: 0.97 }], borderColor: COLOR.blue },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: RADII.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  optionLabel: { fontFamily: FONT.semiBold, fontSize: 15, color: COLOR.ink, textAlign: 'center' },
  optionHint: {
    fontFamily: FONT.regular,
    fontSize: 11.5,
    color: COLOR.inkSoft,
    textAlign: 'center',
    marginTop: 3,
    minHeight: 30,
  },
  optionCta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.sm },
  optionCtaText: { fontFamily: FONT.bold, fontSize: 12, color: COLOR.blue },
});
