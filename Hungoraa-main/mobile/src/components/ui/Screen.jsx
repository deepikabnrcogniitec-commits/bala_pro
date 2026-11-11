import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLOR } from '../../theme';

/**
 * Page shell — cream background + safe-area. `scroll` wraps children in a
 * ScrollView; `edges` controls which safe-area edges are padded.
 */
export default function Screen({
  children,
  scroll = false,
  contentStyle,
  style,
  edges = ['top'],
  refreshing,
  onRefresh,
  bg = COLOR.bg,
  contentContainerStyle,
}) {
  const Body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.scrollContent, contentContainerStyle, contentStyle]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={COLOR.terracotta}
            colors={[COLOR.terracotta]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: bg }, style]}>
      {Body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
});
