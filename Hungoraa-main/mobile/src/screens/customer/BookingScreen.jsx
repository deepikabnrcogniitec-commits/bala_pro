import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
  Platform, StatusBar, TextInput, ActivityIndicator, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import restaurantApi from '../../api/restaurant.api';
import bookingApi from '../../api/booking.api';
import { COLORS, FONTS, SIZES, SPACING, BORDER_RADIUS, SHADOW } from '../../constants';

const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const TIME_SLOTS = ['12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM'];

const getNext14Days = () => {
  const days = [];
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      date: d.toISOString().split('T')[0],
      day: dayNames[d.getDay()],
      num: d.getDate(),
      month: monthNames[d.getMonth()],
      isToday: i === 0,
    });
  }
  return days;
};

const periodOfSlot = (slot = '') => {
  const [t, mer] = slot.split(' ');
  let h = parseInt((t || '0').split(':')[0], 10) || 0;
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  if (h < 12) return 'Breakfast';
  if (h < 16) return 'Lunch';
  if (h < 19) return 'Evening';
  return 'Dinner';
};
const SLOT_PERIODS = ['Breakfast', 'Lunch', 'Evening', 'Dinner'];

const offerDealLabel = (o) => (o.type === 'percentage'
  ? `${o.discountValue}% Off${o.maxDiscount ? ` up to ₹${o.maxDiscount}` : ''}`
  : o.type === 'flat' ? `Flat ₹${o.discountValue} Off`
    : o.type === 'bogo' ? 'Buy 1 Get 1 Free'
      : (o.type?.replace(/_/g, ' ') || 'Special offer'));

export default function BookingScreen({ navigation, route }) {
  const {
    restaurantId, restaurantName, restaurant: restaurantMeta, offers: passedOffers,
    date: prefillDate, time: prefillTime, guests: prefillGuests,
  } = route.params || {};
  const dates = getNext14Days();
  const bookingOffers = (passedOffers || []).filter((o) => !o.applicableTo?.length || o.applicableTo.includes('booking'));

  const [selectedDate, setSelectedDate] = useState(prefillDate || dates[0].date);
  const [selectedTime, setSelectedTime] = useState(prefillTime || '');
  const [guests, setGuests] = useState(prefillGuests || 2);
  const [specialRequest, setSpecialRequest] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableModalVisible, setTableModalVisible] = useState(false);

  const { data: availabilityData, isLoading } = useQuery({
    queryKey: ['availability', restaurantId, selectedDate, guests],
    queryFn: () =>
      restaurantApi.getAvailability(restaurantId, undefined, selectedDate, guests).then((r) => r.data.data),
    enabled: !!restaurantId && !!selectedDate,
  });

  const tables = availabilityData?.tables || [];
  const availableSlots = availabilityData?.availableSlots || TIME_SLOTS;

  const holdMutation = useMutation({
    mutationFn: () =>
      bookingApi.holdBooking({
        restaurantId,
        tableId: selectedTable,
        date: selectedDate,
        time: selectedTime,
        guests,
        specialRequest,
      }).then((r) => r.data.data),
    onSuccess: (data) => {
      navigation.navigate('Home', { screen: 'BookingConfirm', params: {
        restaurantId,
        restaurantName,
        restaurant: restaurantMeta,
        offers: bookingOffers,
        date: selectedDate,
        time: selectedTime,
        guests,
        tableId: selectedTable,
        specialRequest,
        holdId: data.booking._id,
        holdExpiresAt: data.booking.holdExpiresAt,
        requiresDeposit: data.requiresDeposit,
        depositAmount: data.depositAmount,
      } });
    },
    onError: (err) => {
      Toast.show({
        type: 'error',
        text1: 'Table not available',
        text2: err.response?.data?.message || 'Please select a different table or time',
      });
    },
  });

  const handleContinue = () => {
    if (!selectedTime) return Toast.show({ type: 'error', text1: 'Please select a time slot' });
    // Table is optional — the restaurant assigns one if the guest doesn't pick.
    holdMutation.mutate();
  };

  const selectedTableObj = tables.find((t) => (t._id || t.id) === selectedTable);
  const availableTables = tables.filter((t) => t.isAvailable);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1B5E8F', '#0C2F4E']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Reserve Table</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{restaurantName}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Step Indicator */}
        <View style={styles.stepRow}>
          {['Date', 'Time', 'Guests', 'Table'].map((step, i) => (
            <React.Fragment key={step}>
              <View style={[styles.stepDot, i <= 1 && styles.stepDotActive]}>
                <Text style={[styles.stepNum, i <= 1 && styles.stepNumActive]}>{i + 1}</Text>
              </View>
              {i < 3 && <View style={[styles.stepLine, i < 1 && styles.stepLineActive]} />}
            </React.Fragment>
          ))}
        </View>

        {/* Date Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.primary} /> Select Date
          </Text>
          <FlatList
            data={dates}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateList}
            keyExtractor={(item) => item.date}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.dateItem, selectedDate === item.date && styles.dateItemActive]}
                onPress={() => { setSelectedDate(item.date); setSelectedTime(''); setSelectedTable(null); }}
              >
                <Text style={[styles.dateDay, selectedDate === item.date && styles.dateTextActive]}>{item.day}</Text>
                <Text style={[styles.dateNum, selectedDate === item.date && styles.dateNumActive]}>{item.num}</Text>
                <Text style={[styles.dateMonth, selectedDate === item.date && styles.dateTextActive]}>{item.month}</Text>
                {item.isToday && <View style={[styles.todayDot, selectedDate === item.date && styles.todayDotActive]} />}
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Guests Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="people-outline" size={16} color={COLORS.primary} /> Number of Guests
          </Text>
          <View style={styles.guestRow}>
            {GUEST_OPTIONS.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.guestChip, guests === n && styles.guestChipActive]}
                onPress={() => { setGuests(n); setSelectedTable(null); }}
              >
                <Text style={[styles.guestNum, guests === n && styles.guestNumActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Slots — grouped by period */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="time-outline" size={16} color={COLORS.primary} /> Select Time
          </Text>
          {SLOT_PERIODS.map((period) => {
            const periodSlots = availableSlots.filter((s) => periodOfSlot(s) === period);
            if (!periodSlots.length) return null;
            return (
              <View key={period} style={styles.periodGroup}>
                <Text style={styles.periodTitle}>{period}</Text>
                <View style={styles.timeGrid}>
                  {periodSlots.map((slot) => {
                    const isBooked = availabilityData?.bookedSlots?.includes(slot);
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.timeSlot, selectedTime === slot && styles.timeSlotActive, isBooked && styles.timeSlotBooked]}
                        onPress={() => !isBooked && setSelectedTime(slot)}
                        disabled={isBooked}
                      >
                        <Text style={[styles.timeText, selectedTime === slot && styles.timeTextActive, isBooked && styles.timeTextBooked]}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        {/* Deals for this booking */}
        {bookingOffers.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="pricetag-outline" size={16} color={COLORS.primary} /> Deals available
            </Text>
            {bookingOffers.map((o) => (
              <View key={o._id} style={styles.dealRow}>
                <View style={styles.dealIcon}>
                  <Ionicons name="pricetag" size={14} color="#C8952B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dealName}>{offerDealLabel(o)}</Text>
                  <Text style={styles.dealSub} numberOfLines={1}>{o.title}</Text>
                </View>
                {o.code ? <Text style={styles.dealCode}>{o.code}</Text> : null}
              </View>
            ))}
            <Text style={styles.dealHint}>Apply a code on the next step to redeem.</Text>
          </View>
        ) : null}

        {/* Table Selector — opens a centered popup; optional */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="restaurant-outline" size={16} color={COLORS.primary} /> Select Table (Optional)
          </Text>
          <TouchableOpacity
            style={styles.tablePicker}
            onPress={() => setTableModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.tablePickerLeft}>
              <Text style={styles.tableEmoji}>
                {selectedTableObj
                  ? (selectedTableObj.type === 'booth' ? '🛋️' : selectedTableObj.type === 'outdoor' ? '🌿' : '🍽️')
                  : '🍽️'}
              </Text>
              <View>
                <Text style={styles.tablePickerValue}>
                  {selectedTableObj
                    ? (selectedTableObj.name || `Table T${selectedTableObj.number}`)
                    : 'Any available table'}
                </Text>
                <Text style={styles.tablePickerHint}>
                  {selectedTableObj
                    ? `${selectedTableObj.capacity} seats`
                    : 'Tap to choose — or skip and let the restaurant seat you'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        {/* Special Request */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="chatbox-outline" size={16} color={COLORS.primary} /> Special Request (Optional)
          </Text>
          <TextInput
            style={styles.requestInput}
            value={specialRequest}
            onChangeText={setSpecialRequest}
            placeholder="Birthday arrangement, high chair, window seat, allergies..."
            placeholderTextColor={COLORS.lightGray}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Summary */}
        {selectedTime && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <SummaryRow icon="calendar" label="Date" value={selectedDate} />
            <SummaryRow icon="time" label="Time" value={selectedTime} />
            <SummaryRow icon="people" label="Guests" value={`${guests} people`} />
            <SummaryRow icon="restaurant" label="Table" value={selectedTableObj?.name || (selectedTableObj ? 'Selected' : 'Any available')} />
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* CTA */}
      <View style={styles.cta}>
        <View style={styles.ctaInfo}>
          <Text style={styles.ctaTitle}>{selectedDate} • {selectedTime || '--:--'}</Text>
          <Text style={styles.ctaSub}>{guests} guests • {restaurantName}</Text>
        </View>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinue}
          activeOpacity={0.88}
          disabled={holdMutation.isPending}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.continueBtnGrad}>
            {holdMutation.isPending
              ? <ActivityIndicator color={COLORS.white} size="small" />
              : <Text style={styles.continueBtnText}>Continue →</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Centered table-selection popup ─────────────────────────────── */}
      <Modal
        visible={tableModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setTableModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setTableModalVisible(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose a table</Text>
              <TouchableOpacity onPress={() => setTableModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Optional — skip to let the restaurant seat you.</Text>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalGrid} showsVerticalScrollIndicator={false}>
              {isLoading ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
              ) : availableTables.length === 0 ? (
                <Text style={styles.modalEmpty}>No tables listed for this slot. You can still continue — the restaurant will assign one.</Text>
              ) : (
                availableTables.map((table) => {
                  const id = table._id || table.id;
                  const active = selectedTable === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.tableCard, styles.modalTableCard, active && styles.tableCardActive]}
                      onPress={() => { setSelectedTable(id); setTableModalVisible(false); }}
                    >
                      <Text style={styles.tableEmoji}>{table.type === 'booth' ? '🛋️' : table.type === 'outdoor' ? '🌿' : '🍽️'}</Text>
                      <Text style={[styles.tableName, active && styles.tableNameActive]}>
                        {table.name || `T${table.number}`}
                      </Text>
                      <Text style={styles.tableCapacity}>{table.capacity} seats</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSkipBtn}
                onPress={() => { setSelectedTable(null); setTableModalVisible(false); }}
              >
                <Text style={styles.modalSkipText}>Skip — any table</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDoneBtn}
                onPress={() => setTableModalVisible(false)}
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SummaryRow({ icon, label, value }) {
  return (
    <View style={sumStyles.row}>
      <View style={sumStyles.iconWrap}>
        <Ionicons name={`${icon}-outline`} size={14} color={COLORS.primary} />
      </View>
      <Text style={sumStyles.label}>{label}</Text>
      <Text style={sumStyles.value}>{value}</Text>
    </View>
  );
}

const sumStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 6 },
  iconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: SIZES.sm, color: COLORS.gray, fontFamily: FONTS.regular },
  value: { fontSize: SIZES.sm, color: COLORS.dark, fontFamily: FONTS.bold },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  backBtn: { padding: 4 },
  headerText: {},
  headerTitle: { fontSize: SIZES.lg, fontFamily: FONTS.bold, color: COLORS.white },
  headerSub: { fontSize: SIZES.sm, color: 'rgba(255,255,255,0.65)', fontFamily: FONTS.regular },
  body: { flex: 1 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.card,
    gap: 4,
  },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepNum: { fontSize: SIZES.xs, fontFamily: FONTS.bold, color: COLORS.gray },
  stepNumActive: { color: COLORS.white },
  stepLine: { flex: 1, height: 2, backgroundColor: COLORS.border },
  stepLineActive: { backgroundColor: COLORS.primary },
  section: { backgroundColor: COLORS.card, padding: SPACING.lg, marginBottom: 8 },
  sectionTitle: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.dark, marginBottom: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateList: { gap: SPACING.sm, paddingBottom: 4 },
  dateItem: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    minWidth: 58,
    backgroundColor: COLORS.background,
  },
  dateItemActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dateDay: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular },
  dateNum: { fontSize: SIZES.xl, color: COLORS.dark, fontFamily: FONTS.bold, marginVertical: 2 },
  dateMonth: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular },
  dateTextActive: { color: 'rgba(255,255,255,0.85)' },
  dateNumActive: { color: COLORS.white },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, marginTop: 2 },
  todayDotActive: { backgroundColor: COLORS.white },
  guestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  guestChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  guestChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  guestNum: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.gray },
  guestNumActive: { color: COLORS.white },
  periodGroup: { marginTop: SPACING.sm },
  periodTitle: {
    fontSize: 11, fontFamily: FONTS.bold, color: COLORS.gray,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
  },
  dealRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderWidth: 1, borderColor: '#E8D9B5', backgroundColor: '#FBF4E4',
    borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.sm,
  },
  dealIcon: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#F3E6C8',
    alignItems: 'center', justifyContent: 'center',
  },
  dealName: { fontSize: SIZES.sm, fontFamily: FONTS.bold, color: '#0C2F4E' },
  dealSub: { fontSize: SIZES.xs, fontFamily: FONTS.regular, color: COLORS.gray, marginTop: 1 },
  dealCode: {
    fontSize: 11, fontFamily: FONTS.bold, color: '#A9791D', letterSpacing: 0.5,
    borderWidth: 1, borderColor: '#C8952B', borderStyle: 'dashed',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  dealHint: { fontSize: SIZES.xs, fontFamily: FONTS.regular, color: COLORS.lightGray, marginTop: 2 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  timeSlot: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  timeSlotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  timeSlotBooked: { backgroundColor: COLORS.background, borderColor: COLORS.border, opacity: 0.5 },
  timeText: { fontSize: SIZES.sm, fontFamily: FONTS.medium, color: COLORS.dark },
  timeTextActive: { color: COLORS.white },
  timeTextBooked: { color: COLORS.lightGray, textDecorationLine: 'line-through' },
  tableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  tableCard: {
    width: '30%',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 3,
  },
  tableCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
  tableCardUnavailable: { opacity: 0.5 },
  tableEmoji: { fontSize: 20 },
  tableName: { fontSize: SIZES.xs, fontFamily: FONTS.bold, color: COLORS.dark },
  tableNameActive: { color: COLORS.primary },
  tableCapacity: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular },
  tableBooked: { fontSize: 10, color: COLORS.error, fontFamily: FONTS.medium },
  requestInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: SIZES.base,
    color: COLORS.dark,
    fontFamily: FONTS.regular,
    backgroundColor: COLORS.background,
    minHeight: 80,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    margin: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    ...SHADOW.sm,
  },
  summaryTitle: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.dark, marginBottom: SPACING.sm },
  cta: {
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 30 : SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOW.lg,
  },
  ctaInfo: {},
  ctaTitle: { fontSize: SIZES.sm, fontFamily: FONTS.bold, color: COLORS.dark },
  ctaSub: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular, marginTop: 2 },
  continueBtn: { borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
  continueBtnGrad: { paddingHorizontal: SPACING.xl, paddingVertical: 14 },
  continueBtnText: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.white },

  // Table picker row (opens the popup)
  tablePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  tablePickerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  tablePickerValue: { fontSize: SIZES.base, fontFamily: FONTS.bold, color: COLORS.dark },
  tablePickerHint: { fontSize: SIZES.xs, color: COLORS.gray, fontFamily: FONTS.regular, marginTop: 2, paddingRight: SPACING.md },

  // Centered table popup
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12,47,78,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOW.lg,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: SIZES.lg, fontFamily: FONTS.bold, color: COLORS.dark },
  modalSub: { fontSize: SIZES.sm, color: COLORS.gray, fontFamily: FONTS.regular, marginTop: 4, marginBottom: SPACING.md },
  modalBody: { flexGrow: 0, flexShrink: 1 },
  modalGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACING.sm },
  modalTableCard: { width: '31%' },
  modalEmpty: { fontSize: SIZES.sm, color: COLORS.gray, fontFamily: FONTS.regular, lineHeight: 20, paddingVertical: SPACING.md },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  modalSkipBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalSkipText: { fontSize: SIZES.sm, fontFamily: FONTS.bold, color: COLORS.dark },
  modalDoneBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalDoneText: { fontSize: SIZES.sm, fontFamily: FONTS.bold, color: COLORS.white },
});
