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

export default function ResetPasswordScreen({ navigation, route }) {
  const { token } = route.params || {};
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.resetPassword(token, password, confirmPassword),
    onSuccess: () => setDone(true),
    onError: (err) => {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Reset failed' });
    },
  });

  const handleSubmit = () => {
    if (password.length < 8) return Alert.alert('Error', 'Password must be at least 8 characters');
    if (password !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');
    mutation.mutate();
  };

  if (done) {
    return (
      <View style={styles.successContainer}>
        <LinearGradient colors={[COLORS.secondary, '#40916c']} style={styles.successGrad}>
          <Text style={{ fontSize: 64, marginBottom: SPACING.lg }}>✅</Text>
          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successSub}>Your password has been changed successfully.</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.replace('Login')}>
            <Text style={styles.loginBtnText}>Go to Login</Text>
          </TouchableOpacity>
        </LinearGradient>
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
        <Text style={styles.headerTitle}>New Password</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 36 }}>🔒</Text>
        </View>
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>Create a strong, unique password for your account</Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.gray} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry={!showPass}
                placeholderTextColor={COLORS.lightGray}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.gray} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat your password"
                secureTextEntry
                placeholderTextColor={COLORS.lightGray}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={mutation.isPending}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.btnGradient}>
              {mutation.isPending
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.btnText}>Reset Password</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  successContainer: { flex: 1 },
  successGrad: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  successTitle: { fontSize: SIZES.h1, fontFamily: FONTS.bold, color: COLORS.white, marginBottom: SPACING.md },
  successSub: { fontSize: SIZES.base, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: SPACING.xl },
  loginBtn: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.md, paddingVertical: 14, paddingHorizontal: SPACING.xxl },
  loginBtnText: { fontSize: SIZES.md, fontFamily: FONTS.bold, color: COLORS.secondary },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg, gap: SPACING.md,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: SIZES.lg, fontFamily: FONTS.bold, color: COLORS.white },
  body: { flex: 1, backgroundColor: COLORS.card, padding: SPACING.xl, alignItems: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.lg, marginBottom: SPACING.lg },
  title: { fontSize: SIZES.h2, fontFamily: FONTS.bold, color: COLORS.black, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: SIZES.base, color: COLORS.gray, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  form: { width: '100%', gap: SPACING.sm },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: SIZES.sm, fontFamily: FONTS.medium, color: COLORS.dark },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.background, paddingHorizontal: SPACING.md, height: 52 },
  input: { flex: 1, fontSize: SIZES.base, color: COLORS.black, fontFamily: FONTS.regular },
  submitBtn: { borderRadius: BORDER_RADIUS.md, overflow: 'hidden', marginTop: 8 },
  btnGradient: { paddingVertical: 16, alignItems: 'center' },
  btnText: { fontSize: SIZES.md, fontFamily: FONTS.bold, color: COLORS.white },
});
