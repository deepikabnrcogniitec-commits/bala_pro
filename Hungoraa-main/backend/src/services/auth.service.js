const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const { generateTokenPair } = require('../utils/jwt');
const { sendOTP } = require('./otp.service');
const { sendWelcomeEmail, sendPasswordResetEmail, sendEmailVerification } = require('./email.service');
const logger = require('../utils/logger');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Create wallet for new users
const createUserWallet = async (userId) => {
  const wallet = await Wallet.create({ user: userId });
  await User.findByIdAndUpdate(userId, { wallet: wallet._id });
  return wallet;
};

// ─── Phone / OTP ────────────────────────────────────────────────────────────

const sendPhoneOTP = async (phone) => {
  phone = phone.replace(/\s+/g, '');
  let user = await User.findOne({ phone });

  if (!user) {
    user = await User.create({ phone, name: 'User', role: 'customer' });
    await createUserWallet(user._id);
  }

  if (user.isBlocked) { const e = new Error('Account is suspended. Please contact support.'); e.statusCode = 403; throw e; }

  const otp = user.generateOTP();
  await user.save();
  await sendOTP(phone, otp);

  return { message: 'OTP sent successfully', isNewUser: !user.isPhoneVerified };
};

const verifyPhoneOTP = async (phone, otp, deviceId) => {
  phone = phone.replace(/\s+/g, '');
  const user = await User.findOne({ phone }).select('+otp');
  if (!user) { const e = new Error('User not found'); e.statusCode = 404; throw e; }

  // Dev bypass: accept 123456 without real OTP check
  if (process.env.NODE_ENV !== 'development' || otp !== '123456') {
    const result = user.verifyOTP(otp);
    if (!result.valid) { const e = new Error(result.reason); e.statusCode = 400; throw e; }
  }

  user.otp = undefined;
  user.isPhoneVerified = true;
  user.lastLoginAt = new Date();

  // Manage refresh tokens (keep last 5 devices)
  const tokens = generateTokenPair({ id: user._id, role: user.role });
  user.refreshTokens = [
    { token: tokens.refreshToken, deviceId },
    ...(user.refreshTokens || []).slice(0, 4),
  ];

  await user.save();
  if (!user.wallet) await createUserWallet(user._id);

  return { user: user.toSafeObject(), ...tokens };
};

// ─── Email / Password ────────────────────────────────────────────────────────

const registerWithEmail = async ({ name, email, password, phone, role = 'customer' }) => {
  const cleanPhone = phone ? phone.replace(/\s+/g, '') : null;
  const existing = await User.findOne({ $or: [{ email }, ...(cleanPhone ? [{ phone: cleanPhone }] : [])] });
  if (existing) {
    const e = new Error(existing.email === email ? 'Email already registered' : 'Phone already registered');
    e.statusCode = 409;
    throw e;
  }

  const user = await User.create({ name, email, ...(cleanPhone ? { phone: cleanPhone } : {}), password, role });
  await createUserWallet(user._id);

  // Email verification token
  const verifyToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`;
  await sendWelcomeEmail(user).catch(() => {});
  await sendEmailVerification(user, verifyUrl).catch(() => {});

  return { message: 'Registration successful. Please verify your email.', userId: user._id };
};

const loginWithEmail = async (email, password, deviceId) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user) { const e = new Error('Invalid email or password'); e.statusCode = 401; throw e; }
  if (user.isBlocked) { const e = new Error('Account suspended. Contact support.'); e.statusCode = 403; throw e; }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) { const e = new Error('Invalid email or password'); e.statusCode = 401; throw e; }

  user.lastLoginAt = new Date();
  const tokens = generateTokenPair({ id: user._id, role: user.role });
  user.refreshTokens = [
    { token: tokens.refreshToken, deviceId },
    ...(user.refreshTokens || []).slice(0, 4),
  ];
  await user.save();

  return { user: user.toSafeObject(), ...tokens };
};

const verifyEmail = async (token) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) { const e = new Error('Invalid or expired verification link'); e.statusCode = 400; throw e; }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return { message: 'Email verified successfully' };
};

// ─── Google OAuth ─────────────────────────────────────────────────────────────

const loginWithGoogle = async (idToken, deviceId) => {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const { sub: googleId, email, name, picture } = payload;

  let user = await User.findOne({ $or: [{ googleId }, { email }] });

  if (!user) {
    user = await User.create({
      googleId,
      email,
      name,
      avatar: { url: picture },
      isEmailVerified: true,
      role: 'customer',
    });
    await createUserWallet(user._id);
    await sendWelcomeEmail(user).catch(() => {});
  } else {
    if (!user.googleId) user.googleId = googleId;
    if (!user.avatar?.url) user.avatar = { url: picture };
  }

  if (user.isBlocked) { const e = new Error('Account suspended. Contact support.'); e.statusCode = 403; throw e; }

  user.lastLoginAt = new Date();
  const tokens = generateTokenPair({ id: user._id, role: user.role });
  user.refreshTokens = [
    { token: tokens.refreshToken, deviceId },
    ...(user.refreshTokens || []).slice(0, 4),
  ];
  await user.save();

  return { user: user.toSafeObject(), ...tokens };
};

// ─── Password Reset ──────────────────────────────────────────────────────────

const forgotPassword = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) { const e = new Error('No account found with this email'); e.statusCode = 404; throw e; }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  await sendPasswordResetEmail(user, resetUrl);

  return { message: 'Password reset email sent' };
};

const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) { const e = new Error('Invalid or expired reset link'); e.statusCode = 400; throw e; }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = []; // invalidate all sessions
  await user.save();

  return { message: 'Password reset successfully. Please login.' };
};

// ─── Token Refresh ───────────────────────────────────────────────────────────

const refreshAccessToken = async (refreshToken) => {
  const { verifyRefreshToken, generateAccessToken } = require('../utils/jwt');

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new Error('Invalid or expired refresh token');
  }

  const user = await User.findOne({
    _id: decoded.id,
    'refreshTokens.token': refreshToken,
  });

  if (!user) { const e = new Error('Session expired. Please login again.'); e.statusCode = 401; throw e; }
  if (user.isBlocked) { const e = new Error('Account suspended.'); e.statusCode = 403; throw e; }

  const newAccessToken = generateAccessToken({ id: user._id, role: user.role });
  return { accessToken: newAccessToken };
};

// ─── Logout ──────────────────────────────────────────────────────────────────

const logout = async (userId, refreshToken) => {
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: { token: refreshToken } },
  });
  return { message: 'Logged out successfully' };
};

const logoutAll = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshTokens: [] });
  return { message: 'Logged out from all devices' };
};

module.exports = {
  sendPhoneOTP,
  verifyPhoneOTP,
  registerWithEmail,
  loginWithEmail,
  verifyEmail,
  loginWithGoogle,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  logout,
  logoutAll,
};
