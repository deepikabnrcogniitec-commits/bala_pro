import React from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../../api/notification.api';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants';

const TYPE_ICONS = {
  booking_confirmed: '✅', booking_cancelled: '❌', booking_reminder: '⏰',
  offer: '🏷️', system: '📢', review: '⭐', payment: '💳',
};


export default function NotificationsScreen({ navigation }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getAll().then((r) => r.data.data.notifications),
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data || [];
  const hasUnread = notifications.some((n) => !n.isRead);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notifCard, !item.isRead && styles.unread]}
      onPress={() => !item.isRead && markReadMutation.mutate(item._id)}
      activeOpacity={0.8}
    >
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{TYPE_ICONS[item.type] || '🔔'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, !item.isRead && styles.boldTitle]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.time}>
          {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {hasUnread ? (
          <TouchableOpacity onPress={() => markAllMutation.mutate()} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>We'll notify you about bookings and offers</Text>
            </View>
          )}
        />
      )}
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
  list: { padding: SPACING.md, gap: 10 },
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  unread: { borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  iconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F6F1E8', justifyContent: 'center', alignItems: 'center',
  },
  icon: { fontSize: 22 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 14, color: '#6F6862', flex: 1 },
  boldTitle: { color: '#1E1B18', fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginLeft: 8 },
  message: { fontSize: 13, color: '#6F6862', lineHeight: 18, marginBottom: 6 },
  time: { fontSize: 11, color: '#A79E95' },
  markAllBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  markAllText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E1B18', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6F6862', textAlign: 'center' },
});
