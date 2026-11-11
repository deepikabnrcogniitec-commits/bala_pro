import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import authApi from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { COLORS, FONTS, SIZES, SPACING, BORDER_RADIUS, SHADOW } from '../../constants';

const OTP_LENGTH = 6;

export default function OTPScreen({ navigation, route }) {
  const { phone, mode = 'login' } = route.params;
  const { setAuth } = useAuthStore();

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) { clearInterval(interval); setCanResend(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text.replace(/\D/g, '').slice(-1);
    setOtp(newOtp);
    if (text && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
    if (!text && index > 0) inputs.current[index - 1]?.focus();
  };

  const handleKeyPress = ({ nativeEvent }, index) => {
    if (nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verifyMutation = useMutation({
    mutationFn: () => authApi.verifyOTP(phone, otp.join('')),
    onSuccess: ({ data }) => {
      const { user, accessToken, refreshToken } = data.data;
      setAuth(user, accessToken, refreshToken);
      Toast.show({ type: 'success', text1: `Welcome, ${user.name}! 🎉` });
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Invalid OTP' });
      setOtp(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => authApi.sendOTP(phone),
    onSuccess: () => {
      setTimer(30);
      setCanResend(false);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
      Toast.show({ type: 'success', text1: 'OTP resent!' });
    },
  });

  const handleVerify = () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) return Toast.show({ type: 'error', text1: 'Enter complete OTP' });
    verifyMutation.mutate();
  };

  const maskedPhone = phone.replace(/(\+?\d{2,3})(\d+)(\d{4})/, '$1******$3');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1B5E8F', '#0C2F4E']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify OTP</Text>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>📱</Text>
        </View>
        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit code to{'\n'}<Text style={styles.phone}>{maskedPhone}</Text>
        </Text>

        {/* OTP Boxes */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(el) => (inputs.current[index] = el)}
              style={[styles.otpBox, digit && styles.otpBoxFilled]}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="numeric"
              maxLength={1}
              autoFocus={index === 0}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Timer */}
        <View style={styles.timerRow}>
          {canResend ? (
            <TouchableOpacity onPress={() => resendMutation.mutate()} disabled={resendMutation.isPending}>
              <Text style={styles.resendText}>
                {resendMutation.isPending ? 'Sending...' : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>
              Resend in <Text style={{ color: COLORS.primary }}>{timer}s</Text>
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.verifyBtn}
          onPress={handleVerify}
          activeOpacity={0.85}
          disabled={verifyMutation.isPending || otp.join('').length < OTP_LENGTH}
        >
          <LinearGradient
            colors={otp.join('').length < OTP_LENGTH ? [COLORS.silver, COLORS.silver] : [COLORS.primary, COLORS.primaryDark]}
            style={styles.btnGradient}
          >
            {verifyMutation.isPending ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.btnText}>Verify & Continue</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.note}>
          📌 Dev mode: use OTP <Text style={{ color: COLORS.primary, fontFamily: FONTS.bold }}>123456</Text> to skip verification
        </Text>
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
  backBtn: { padding: 4 },
  headerTitle: { fontSize: SIZES.lg, fontFamily: FONTS.bold, color: COLORS.white },
  body: { flex: 1, backgroundColor: COLORS.card, padding: SPACING.xl, alignItems: 'center' },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  iconEmoji: { fontSize: 36 },
  title: { fontSize: SIZES.h2, fontFamily: FONTS.bold, color: COLORS.black, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: SIZES.base, color: COLORS.gray, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  phone: { fontFamily: FONTS.bold, color: COLORS.dark },
  otpContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    textAlign: 'center',
    fontSize: SIZES.xl,
    fontFamily: FONTS.bold,
    color: COLORS.black,
    backgroundColor: COLORS.background,
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryBg,
    color: COLORS.primary,
  },
  timerRow: { marginBottom: SPACING.xl },
  timerText: { fontSize: SIZES.base, color: COLORS.gray, fontFamily: FONTS.regular },
  resendText: { fontSize: SIZES.base, color: COLORS.primary, fontFamily: FONTS.bold, textDecorationLine: 'underline' },
  verifyBtn: { width: '100%', borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
  btnGradient: { paddingVertical: 16, alignItems: 'center' },
  btnText: { fontSize: SIZES.md, fontFamily: FONTS.bold, color: COLORS.white },
  note: {
    marginTop: SPACING.xl,
    fontSize: SIZES.sm,
    color: COLORS.gray,
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },
});
