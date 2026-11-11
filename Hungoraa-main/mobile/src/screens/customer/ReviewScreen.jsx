import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '../../api/booking.api';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants';

function StarRating({ value, onChange, size = 36 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.7}>
          <Text style={{ fontSize: size, opacity: star <= value ? 1 : 0.25 }}>⭐</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ReviewScreen({ navigation, route }) {
  const { bookingId, restaurantId, restaurantName } = route.params;
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [foodRating, setFoodRating] = useState(5);
  const [serviceRating, setServiceRating] = useState(5);
  const [ambianceRating, setAmbianceRating] = useState(5);
  const [comment, setComment] = useState('');

  const submitMutation = useMutation({
    mutationFn: () => bookingApi.addReview(bookingId, {
      restaurantId,
      rating,
      subRatings: { food: foodRating, service: serviceRating, ambiance: ambianceRating },
      comment,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      Alert.alert('Thank you!', 'Your review has been submitted.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err) => Alert.alert('Error', err.response?.data?.message || 'Could not submit review'),
  });

  const handleSubmit = () => {
    if (comment.trim().length < 10) {
      Alert.alert('Review too short', 'Please write at least 10 characters.');
      return;
    }
    submitMutation.mutate();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Write Review</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.restaurantName}>{restaurantName}</Text>

        {/* Overall Rating */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Overall Experience</Text>
          <View style={styles.starsCenter}>
            <StarRating value={rating} onChange={setRating} size={40} />
            <Text style={styles.ratingLabel}>
              {['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent'][rating]}
            </Text>
          </View>
        </View>

        {/* Sub-ratings */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rate by Category</Text>
          {[
            { label: '🍽️ Food', value: foodRating, onChange: setFoodRating },
            { label: '🤝 Service', value: serviceRating, onChange: setServiceRating },
            { label: '🏮 Ambiance', value: ambianceRating, onChange: setAmbianceRating },
          ].map(({ label, value, onChange }) => (
            <View key={label} style={styles.subRatingRow}>
              <Text style={styles.subRatingLabel}>{label}</Text>
              <StarRating value={value} onChange={onChange} size={24} />
            </View>
          ))}
        </View>

        {/* Comment */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Review</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Share your experience with other diners..."
            placeholderTextColor="#A79E95"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitMutation.isPending && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>Submit Review</Text>}
        </TouchableOpacity>
      </ScrollView>
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
  restaurantName: { fontSize: 20, fontWeight: '800', color: '#1E1B18', textAlign: 'center', marginBottom: SPACING.md },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E1B18', marginBottom: 16 },
  starsCenter: { alignItems: 'center', gap: 8 },
  ratingLabel: { fontSize: 16, fontWeight: '600', color: COLORS.primary, marginTop: 4 },
  subRatingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EAE2D6',
  },
  subRatingLabel: { fontSize: 14, color: '#6F6862', fontWeight: '500' },
  textArea: {
    backgroundColor: '#FBF7F1', borderRadius: 10, padding: 14,
    fontSize: 15, color: '#1E1B18', minHeight: 120, borderWidth: 1, borderColor: '#E2D8C9',
  },
  charCount: { fontSize: 11, color: '#6F6862', textAlign: 'right', marginTop: 6 },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    padding: 18, alignItems: 'center', marginTop: 8,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
