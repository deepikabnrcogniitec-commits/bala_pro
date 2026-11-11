import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import authApi from '../../api/auth.api';
import { COLORS, FONTS, SIZES, SPACING, BORDER_RADIUS, SHADOW } from '../../constants';

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'customer' });
  const [showPass, setShowPass] = useState(false);
  const [registered, setRegistered] = useState(false);

  const emailRef = useRef();
  const phoneRef = useRef();
  const passRef = useRef();

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const registerMutation = useMutation({
    mutationFn: () => authApi.register(form),
    onSuccess: () => setRegistered(true),
    onError: (err) => {
      const msg = err.response?.data?.message
        || (!err.response ? 'Cannot connect to server. Make sure the backend is running.' : 'Please try again');
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: msg });
    },
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return Alert.alert('Error', 'Name is required');
    if (!form.email.trim()) return Alert.alert('Error', 'Email is required');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return Alert.alert('Error', 'Invalid email address');
    if (form.password.length < 8) return Alert.alert('Error', 'Password must be at least 8 characters');
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password))
      return Alert.alert('Error', 'Password must have uppercase, lowercase, and a number');
    registerMutation.mutate();
  };

  if (registered) {
    return (
      <View style={styles.successContainer}>
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.successGrad}>
          <Text style={styles.successEmoji}>📬</Text>
          <Text style={styles.successTitle}>Check Your Email!</Text>
          <Text style={styles.successSub}>
            We've sent a verification link to{'\n'}{form.email}
          </Text>
          <TouchableOpacity
            style={styles.goLoginBtn}
            onPress={() => navigation.replace('Login')}
          >
            <Text style={styles.goLoginText}>Go to Login</Text>
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
        <Text style={styles.headerTitle}>Create Account</Text>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Join Hungora 🍽️</Text>
        <Text style={styles.subtitle}>Create your free account today</Text>

        {/* Role Selector */}
        <View style={styles.roleRow}>
          {[{ val: 'customer', label: '🍽️ Diner', icon: 'restaurant-outline' },
            { val: 'owner', label: '🏪 Owner', icon: 'storefront-outline' }].map((r) => (
            <TouchableOpacity
              key={r.val}
              style={[styles.roleBtn, form.role === r.val && styles.roleBtnActive]}
              onPress={() => update('role', r.val)}
            >
              <Ionicons name={r.icon} size={18} color={form.role === r.val ? COLORS.white : COLORS.gray} />
              <Text style={[styles.roleBtnText, form.role === r.val && styles.roleBtnTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.form}>
          <InputField
            label="Full Name *"
            icon="person-outline"
            value={form.name}
            onChangeText={(v) => update('name', v)}
            placeholder="John Doe"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
          <InputField
            label="Email Address *"
            icon="mail-outline"
            value={form.email}
            onChangeText={(v) => update('email', v)}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            ref={emailRef}
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
          />
          <InputField
            label="Phone Number"
            icon="call-outline"
            value={form.phone}
            onChangeText={(v) => update('phone', v)}
            placeholder="+91 9876543210"
            keyboardType="phone-pad"
            ref={phoneRef}
            returnKeyType="next"
            onSubmitEditing={() => passRef.current?.focus()}
          />
          <InputField
            label="Password *"
            icon="lock-closed-outline"
            value={form.password}
            onChangeText={(v) => update('password', v)}
            placeholder="Min. 8 characters"
            secureTextEntry={!showPass}
            ref={passRef}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.gray} />
              </TouchableOpacity>
            }
          />

          {/* Password strength */}
          {form.password.length > 0 && <PasswordStrength password={form.password} />}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={registerMutation.isPending}
          >
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.btnGradient}>
              {registerMutation.isPending ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.btnText}>Create Account</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.loginRow}>
          <Text style={styles.loginLabel}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ chars', met: password.length >= 8 },
    { label: 'Uppercase', met: /[A-Z]/.test(password) },
    { label: 'Number', met: /\d/.test(password) },
  ];
  const score = checks.filter((c) => c.met).length;
  const colors = ['#e63946', '#C8952B', '#2d6a4f'];

  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthBars}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.strengthBar, { backgroundColor: i < score ? colors[score - 1] : COLORS.border }]}
          />
        ))}
      </View>
      <View style={styles.strengthChecks}>
        {checks.map((c) => (
          <View key={c.label} style={styles.checkItem}>
            <Ionicons
              name={c.met ? 'checkmark-circle' : 'ellipse-outline'}
              size={12}
              color={c.met ? COLORS.secondary : COLORS.lightGray}
            />
            <Text style={[styles.checkLabel, c.met && { color: COLORS.secondary }]}>{c.label}</Text>
          </View>
        ))}
      </View>
    </View>
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
  successContainer: { flex: 1 },
  successGrad: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  successEmoji: { fontSize: 64, marginBottom: SPACING.lg },
  successTitle: { fontSize: SIZES.h1, fontFamily: FONTS.bold, color: COLORS.white, marginBottom: SPACING.md },
  successSub: { fontSize: SIZES.base, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 24, marginBottom: SPACING.xl },
  goLoginBtn: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.md, paddingVertical: 14, paddingHorizontal: SPACING.xxl },
  goLoginText: { fontSize: SIZES.md, fontFamily: FONTS.bold, color: COLORS.primary },
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
  body: { flex: 1, backgroundColor: COLORS.card },
  bodyContent: { padding: SPACING.xl, paddingTop: SPACING.lg },
  title: { fontSize: SIZES.h2, fontFamily: FONTS.bold, color: COLORS.black, marginBottom: 4 },
  subtitle: { fontSize: SIZES.base, color: COLORS.gray, fontFamily: FONTS.regular, marginBottom: SPACING.lg },
  roleRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  roleBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  roleBtnText: { fontSize: SIZES.base, fontFamily: FONTS.medium, color: COLORS.gray },
  roleBtnTextActive: { color: COLORS.white },
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
  strengthContainer: { marginTop: -4 },
  strengthBars: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthChecks: { flexDirection: 'row', gap: SPACING.md },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkLabel: { fontSize: 11, color: COLORS.lightGray, fontFamily: FONTS.regular },
  primaryBtn: { borderRadius: BORDER_RADIUS.md, overflow: 'hidden', marginTop: 8 },
  btnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: SIZES.md, fontFamily: FONTS.bold, color: COLORS.white },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  loginLabel: { fontSize: SIZES.base, color: COLORS.gray, fontFamily: FONTS.regular },
  loginLink: { fontSize: SIZES.base, color: COLORS.primary, fontFamily: FONTS.bold },
});
