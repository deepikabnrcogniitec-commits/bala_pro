import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import authApi from '../../api/auth.api';
import { COLORS, FONTS, SIZES, SPACING, BORDER_RADIUS } from '../../constants';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.forgotPassword(email),
    onSuccess: () => setSent(true),
    onError: (err) => {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Error sending reset email' });
    },
  });

  const handleSubmit = () => {
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      return Alert.alert('Error', 'Please enter a valid email address');
    }
    mutation.mutate();
  };

  if (sent) {
    return (
      <View style={styles.successContainer}>
        <LinearGradient colors={['#1B5E8F', '#0C2F4E']} style={styles.headerGrad}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.successBody}>
          <Text style={styles.successEmoji}>📬</Text>
          <Text style={styles.successTitle}>Email Sent!</Text>
          <Text style={styles.successSub}>
            We've sent password reset instructions to{'\n'}<Text style={{ fontFamily: FONTS.bold, color: COLORS.dark }}>{email}</Text>
          </Text>
          <Text style={styles.note}>The link will expire in 15 minutes.</Text>
          <TouchableOpacity style={styles.backToLoginBtn} onPress={() => navigation.navigate('Login')}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.btnGradient}>
              <Ionicons name="arrow-back" size={16} color={COLORS.white} />
              <Text style={styles.btnText}>Back to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1B5E8F', '#0C2F4E']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Forgot Password</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 36 }}>🔐</Text>
        </View>
        <Text style={styles.title}>Reset Your Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color={COLORS.gray} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.lightGray}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={mutation.isPending}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.btnGradient}>
            {mutation.isPending ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.btnText}>Send Reset Link</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Ionicons name="arrow-back" size={14} color={COLORS.gray} />
          <Text style={styles.backLinkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 20,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  headerGrad: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 20,
    paddingHorizontal: SPACING.lg,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: SIZES.lg, fontFamily: FONTS.bold, color: COLORS.white },
  body: { flex: 1, backgroundColor: COLORS.card, padding: SPACING.xl, alignItems: 'center' },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    marginTop: SPACING.lg, marginBottom: SPACING.lg,
  },
  title: { fontSize: SIZES.h2, fontFamily: FONTS.bold, color: COLORS.black, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: SIZES.base, color: COLORS.gray, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  inputGroup: { width: '100%', gap: 6, marginBottom: SPACING.md },
  inputLabel: { fontSize: SIZES.sm, fontFamily: FONTS.medium, color: COLORS.dark },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    height: 52,
  },
  input: { flex: 1, fontSize: SIZES.base, color: COLORS.black, fontFamily: FONTS.regular },
  submitBtn: { width: '100%', borderRadius: BORDER_RADIUS.md, overflow: 'hidden', marginBottom: SPACING.md },
  btnGradient: { paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  btnText: { fontSize: SIZES.md, fontFamily: FONTS.bold, color: COLORS.white },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  backLinkText: { fontSize: SIZES.base, color: COLORS.gray, fontFamily: FONTS.medium },
  successContainer: { flex: 1 },
  successBody: { flex: 1, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  successEmoji: { fontSize: 64, marginBottom: SPACING.lg },
  successTitle: { fontSize: SIZES.h1, fontFamily: FONTS.bold, color: COLORS.black, marginBottom: SPACING.md },
  successSub: { fontSize: SIZES.base, color: COLORS.gray, textAlign: 'center', lineHeight: 24, marginBottom: SPACING.sm },
  note: { fontSize: SIZES.sm, color: COLORS.lightGray, marginBottom: SPACING.xl },
  backToLoginBtn: { width: '100%', borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
});
