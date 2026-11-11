import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants';

export default function EditProfileScreen({ navigation }) {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore();
  const qc = useQueryClient();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const profileMutation = useMutation({
    mutationFn: (data) => api.put('/users/me', data),
    onSuccess: ({ data }) => {
      setAuth(data.data.user, accessToken, refreshToken);
      qc.invalidateQueries({ queryKey: ['me'] });
      Alert.alert('Success', 'Profile updated!');
    },
    onError: (err) => Alert.alert('Error', err.response?.data?.message || 'Failed to update'),
  });

  const passwordMutation = useMutation({
    mutationFn: (data) => api.put('/users/me/password', data),
    onSuccess: () => {
      Alert.alert('Success', 'Password changed!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => Alert.alert('Error', err.response?.data?.message || 'Failed to change password'),
  });

  const handleSaveProfile = () => {
    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    profileMutation.mutate({ name, email });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) { Alert.alert('Error', 'Fill all password fields'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Error', "Passwords don't match"); return; }
    if (newPassword.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters'); return; }
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <TouchableOpacity style={styles.changePhotoBtn}>
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#A79E95"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#A79E95"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={user?.phone || ''}
              editable={false}
              placeholder="Phone number"
              placeholderTextColor="#A79E95"
            />
            <Text style={styles.helperText}>Phone cannot be changed</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, profileMutation.isPending && { opacity: 0.6 }]}
            onPress={handleSaveProfile}
            disabled={profileMutation.isPending}
          >
            {profileMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>

        {/* Change Password */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          {[
            { label: 'Current Password', value: currentPassword, onChange: setCurrentPassword },
            { label: 'New Password', value: newPassword, onChange: setNewPassword },
            { label: 'Confirm New Password', value: confirmPassword, onChange: setConfirmPassword },
          ].map(({ label, value, onChange }) => (
            <View key={label} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{label}</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#A79E95"
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2D8C9' }, passwordMutation.isPending && { opacity: 0.6 }]}
            onPress={handleChangePassword}
            disabled={passwordMutation.isPending}
          >
            {passwordMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Change Password</Text>}
          </TouchableOpacity>
        </View>
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
  scroll: { padding: SPACING.md, paddingBottom: 60 },
  avatarSection: { alignItems: 'center', paddingVertical: SPACING.lg },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  changePhotoBtn: { marginTop: 12 },
  changePhotoText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  section: {
    backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.md, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1E1B18', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, color: '#6F6862', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#FBF7F1', borderRadius: 10, padding: 14,
    fontSize: 15, color: '#1E1B18', borderWidth: 1, borderColor: '#E2D8C9',
  },
  disabledInput: { color: '#A79E95' },
  helperText: { fontSize: 11, color: '#A79E95', marginTop: 4 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
