import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLOR, RADII, SPACING, text } from '../../theme';

/** Bottom sheet — grabber, cream surface, safe-area padded. */
export default function Sheet({ visible, onClose, title, children, maxHeightPct = 0.85 }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      propagateSwipe
      backdropOpacity={0.45}
      style={styles.modal}
      useNativeDriverForBackdrop
    >
      <View style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.md, maxHeight: `${maxHeightPct * 100}%` }]}>
        <View style={styles.grabber} />
        {title ? <Text style={[text.h2, styles.title]}>{title}</Text> : null}
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: 'flex-end', margin: 0 },
  sheet: {
    backgroundColor: COLOR.bg,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLOR.border,
    marginBottom: SPACING.md,
  },
  title: { marginBottom: SPACING.md },
});
