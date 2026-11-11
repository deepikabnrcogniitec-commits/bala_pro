import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Alert, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import authApi from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';
import { COLORS, FONTS, SIZES, SPACING, BORDER_RADIUS, SHADOW } from '../../constants';

/**
 * Loaded lazily so the auth screen still renders in an environment without
 * the native module (e.g. Expo Go). Returns null there — the Google button
 * shows a "needs a dev build" toast instead of crashing the whole app.
 */
function getGoogleSignin() {
  try {
    // eslint-disable-next-line global-require
    return require('@react-native-google-signin/google-signin');
  } catch (e) {
    return null;
  }
}

export default function LoginScreen({ navigation }) {
  const { setAuth } = useAuthStore();
  const [tab, setTab] = useState('email'); // 'email' | 'phone'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPass, setShowPass] = useState(false);
  const passwordRef = useRef(null);

  const loginMutation = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: ({ data }) => {
      const { user, accessToken, refreshToken } = data.data;
      setAuth(user, accessToken, refreshToken);
      Toast.show({ type: 'success', text1: `Welcome back, ${user.name}! 👋` });
    },
    onError: (err) => {
      const msg = err.response?.data?.message
        || (!err.response ? 'Cannot connect to server. Make sure the backend is running.' : 'Please check your credentials');
      Toast.show({ type: 'error', text1: 'Login Failed', text2: msg });
    },
  });

  const sendOTPMutation = useMutation({
    mutationFn: () => authApi.sendOTP(phone),
    onSuccess: () => {
      navigation.navigate('OTP', { phone, mode: 'login' });
    },
    onError: (err) => {
      const msg = err.response?.data?.message
        || (!err.response ? 'Cannot connect to server. Make sure the backend is running.' : 'Failed to send OTP');
      Toast.show({ type: 'error', text1: msg });
    },
  });

  const handleEmailLogin = () => {
    if (!email.trim()) return Alert.alert('Error', 'Please enter your email');
    if (!password) return Alert.alert('Error', 'Please enter your password');
    loginMutation.mutate();
  };

  const handlePhoneLogin = () => {
    if (!phone || phone.length < 10) return Alert.alert('Error', 'Please enter a valid phone number');
    sendOTPMutation.mutate();
  };

  const googleLoginMutation = useMutation({
    mutationFn: (idToken) => authApi.googleLogin(idToken),
    onSuccess: ({ data }) => {
      const { user, accessToken, refreshToken } = data.data;
      setAuth(user, accessToken, refreshToken);
      Toast.show({ type: 'success', text1: `Welcome, ${user.name}! 👋` });
    },
    onError: (err) => {
      const msg = err.response?.data?.message
        || (!err.response ? 'Cannot connect to server. Make sure the backend is running.' : 'Google sign-in failed');
      Toast.show({ type: 'error', text1: 'Google Sign-In Failed', text2: msg });
    },
  });

  const handleGoogleLogin = async () => {
    const g = getGoogleSignin();
    if (!g) {
      Toast.show({
        type: 'error',
        text1: 'Google Sign-In needs a dev build',
        text2: 'Run the app from a development/production build, not Expo Go.',
      });
      return;
    }
    const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = g;
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        googleLoginMutation.mutate(response.data.idToken);
      }
    } catch (err) {
      if (isErrorWithCode(err)) {
        if (err.code === statusCodes.SIGN_IN_CANCELLED) return;
        if (err.code === statusCodes.IN_PROGRESS) return;
        if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Toast.show({ type: 'error', text1: 'Google Play Services not available' });
          return;
        }
      }
      Toast.show({ type: 'error', text1: 'Google Sign-In Failed', text2: err.message || 'Something went wrong' });
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1B5E8F', '#0C2F4E']} style={styles.header}>
        <Image
          source={require('../../../assets/bg-remove -logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="Hungora"
        />
        <Text style={styles.headerSub}>Your Table, Your Way</Text>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        {/* Tab Switch */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'email' && styles.tabActive]}
            onPress={() => setTab('email')}
          >
            <Ionicons name="mail-outline" size={16} color={tab === 'email' ? COLORS.white : COLORS.gray} />
            <Text style={[styles.tabText, tab === 'email' && styles.tabTextActive]}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'phone' && styles.tabActive]}
            onPress={() => setTab('phone')}
          >
            <Ionicons name="phone-portrait-outline" size={16} color={tab === 'phone' ? COLORS.white : COLORS.gray} />
            <Text style={[styles.tabText, tab === 'phone' && styles.tabTextActive]}>Mobile OTP</Text>
          </TouchableOpacity>
        </View>

        {tab === 'email' ? (
          <View style={styles.form}>
            <InputField
              label="Email Address"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <InputField
              label="Password"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry={!showPass}
              ref={passwordRef}
              returnKeyType="done"
              onSubmitEditing={handleEmailLogin}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.gray} />
                </TouchableOpacity>
              }
            />
            <TouchableOpacity
              style={styles.forgotLink}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleEmailLogin}
              activeOpacity={0.85}
              disabled={loginMutation.isPending}
            >
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.btnGradient}>
                {loginMutation.isPending ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.btnText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <InputField
              label="Mobile Number"
              icon="phone-portrait-outline"
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 9876543210"
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={handlePhoneLogin}
            />
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handlePhoneLogin}
              activeOpacity={0.85}
              disabled={sendOTPMutation.isPending}
            >
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.btnGradient}>
                {sendOTPMutation.isPending ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.btnText}>Send OTP</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity
          style={styles.googleBtn}
          activeOpacity={0.8}
          onPress={handleGoogleLogin}
          disabled={googleLoginMutation.isPending}
        >
          {googleLoginMutation.isPending ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.registerRow}>
          <Text style={styles.registerLabel}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const InputField = React.forwardRef(({ label, icon, rightIcon, ...props }, ref) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputWrapper}>
      <Ionicons name={icon} size={18} color={COLORS.gray} style={styles.inputIcon} />
      <TextInput
        ref={ref}
        style={styles.input}
        placeholderTextColor={COLORS.lightGray}
        {...props}
      />
      {rightIcon && <View style={styles.inputRight}>{rightIcon}</View>}
    </View>
  </View>
));

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 32,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
  },
  logo: { width: 170, height: 29 },
  headerSub: { fontSize: SIZES.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontFamily: FONTS.regular },
  body: { flex: 1, backgroundColor: COLORS.card },
  bodyContent: { padding: SPACING.xl, paddingTop: SPACING.lg },
  title: { fontSize: SIZES.h1, fontFamily: FONTS.bold, color: COLORS.black, marginBottom: 4 },
  subtitle: { fontSize: SIZES.base, color: COLORS.gray, fontFamily: FONTS.regular, marginBottom: SPACING.lg },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.sm,
  },
  tabActive: { backgroundColor: COLORS.primary, ...SHADOW.sm },
  tabText: { fontSize: SIZES.sm, color: COLORS.gray, fontFamily: FONTS.medium },
  tabTextActive: { color: COLORS.white },
  form: { gap: SPACING.sm },
  inputGroup: { gap: 6 },
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
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, fontSize: SIZES.base, color: COLORS.black, fontFamily: FONTS.regular },
  inputRight: { marginLeft: SPACING.sm },
  forgotLink: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { fontSize: SIZES.sm, color: COLORS.primary, fontFamily: FONTS.medium },
  primaryBtn: { borderRadius: BORDER_RADIUS.md, overflow: 'hidden', marginTop: 8 },
  btnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: SIZES.md, fontFamily: FONTS.bold, color: COLORS.white },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginVertical: SPACING.lg },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: SIZES.sm, color: COLORS.lightGray, fontFamily: FONTS.regular },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 14,
    backgroundColor: COLORS.card,
    ...SHADOW.sm,
  },
  googleIcon: { fontSize: SIZES.lg, fontFamily: FONTS.bold, color: '#4285f4' },
  googleText: { fontSize: SIZES.base, fontFamily: FONTS.medium, color: COLORS.dark },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  registerLabel: { fontSize: SIZES.base, color: COLORS.gray, fontFamily: FONTS.regular },
  registerLink: { fontSize: SIZES.base, color: COLORS.primary, fontFamily: FONTS.bold },
});
