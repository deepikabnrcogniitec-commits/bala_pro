import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentApi } from '../../api/payment.api';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants';

const TX_ICONS = { credit: '⬆️', debit: '⬇️' };
const QUICK_AMOUNTS = [100, 200, 500, 1000];


export default function WalletScreen({ navigation }) {
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [amount, setAmount] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => paymentApi.getWallet(),
  });

  const wallet = data?.data?.data?.wallet || {};
  const { balance, transactions } = wallet;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balance}>₹{balance?.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setAddModalVisible(true)}
          >
            <Text style={styles.addBtnText}>+ Add Money</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Top-up */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Add</Text>
          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={styles.quickChip}
                onPress={() => { setAmount(String(amt)); setAddModalVisible(true); }}
              >
                <Text style={styles.quickChipText}>₹{amt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {isLoading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : transactions?.length === 0 ? (
            <Text style={styles.emptyText}>No transactions yet</Text>
          ) : (
            transactions?.map((tx) => (
              <View key={tx._id} style={styles.txRow}>
                <View style={[styles.txIcon, { backgroundColor: tx.type === 'credit' ? '#2d6a4f20' : '#e6394620' }]}>
                  <Text style={{ fontSize: 18 }}>{TX_ICONS[tx.type]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                  <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'credit' ? '#2d6a4f' : '#e63946' }]}>
                  {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Money Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Money</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholderTextColor="#A79E95"
            />
            <View style={styles.quickRow}>
              {QUICK_AMOUNTS.map((amt) => (
                <TouchableOpacity key={amt} style={styles.quickChip} onPress={() => setAmount(String(amt))}>
                  <Text style={styles.quickChipText}>₹{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalNote}>
              You'll be redirected to Razorpay to complete the payment.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { opacity: !amount || Number(amount) < 1 ? 0.5 : 1 }]}
                disabled={!amount || Number(amount) < 1}
                onPress={() => {
                  setAddModalVisible(false);
                  Alert.alert('Razorpay', `Proceeding to pay ₹${amount} via Razorpay (integration pending in dev mode).`);
                }}
              >
                <Text style={styles.confirmBtnText}>Proceed to Pay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F1' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EAE2D6',
  },
  backBtn: { padding: 8 },
  backText: { fontSize: 22, color: COLORS.primary },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1E1B18' },
  scroll: { padding: SPACING.md, paddingBottom: 40 },
  balanceCard: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg,
    padding: 28, alignItems: 'center', marginBottom: SPACING.md,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8 },
  balance: { color: '#fff', fontSize: 42, fontWeight: '800', marginBottom: 20 },
  addBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 30,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  addBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E1B18', marginBottom: 12 },
  quickRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  quickChip: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  quickChipText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  emptyText: { color: '#6F6862', textAlign: 'center', paddingVertical: 24 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
    marginBottom: 10, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  txIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  txDesc: { fontSize: 14, fontWeight: '600', color: '#1E1B18' },
  txDate: { fontSize: 11, color: '#6F6862', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBox: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E1B18', marginBottom: 20 },
  input: {
    backgroundColor: '#FBF7F1', borderRadius: 12, padding: 16,
    fontSize: 24, fontWeight: '700', color: '#1E1B18',
    borderWidth: 1, borderColor: '#E2D8C9', textAlign: 'center', marginBottom: 16,
  },
  modalNote: { fontSize: 12, color: '#6F6862', textAlign: 'center', marginVertical: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, padding: 16, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#FBF7F1', borderWidth: 1, borderColor: '#E2D8C9',
  },
  cancelBtnText: { color: '#6F6862', fontWeight: '600' },
  confirmBtn: { flex: 2, padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.primary },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
