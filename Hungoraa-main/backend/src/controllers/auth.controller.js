const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

// ─── Phone OTP ────────────────────────────────────────────────────────────────

const sendOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const result = await authService.sendPhoneOTP(phone);
    return successResponse(res, 200, result.message, { isNewUser: result.isNewUser });
  } catch (error) {
    next(error);
  }
};

const verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const deviceId = req.headers['x-device-id'] || req.ip;
    const result = await authService.verifyPhoneOTP(phone, otp, deviceId);
    return successResponse(res, 200, 'Login successful', result);
  } catch (error) {
    next(error);
  }
};

// ─── Email / Password ─────────────────────────────────────────────────────────

const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const result = await authService.registerWithEmail({ name, email, password, phone, role });
    return successResponse(res, 201, result.message, { userId: result.userId });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const deviceId = req.headers['x-device-id'] || req.ip;

    // Track login IP
    const result = await authService.loginWithEmail(email, password, deviceId);
    logger.info(`User ${result.user._id} logged in from ${req.ip}`);
    return successResponse(res, 200, 'Login successful', result);
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const result = await authService.verifyEmail(token);
    return successResponse(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

// ─── Google OAuth ─────────────────────────────────────────────────────────────

const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const deviceId = req.headers['x-device-id'] || req.ip;
    const result = await authService.loginWithGoogle(idToken, deviceId);
    return successResponse(res, 200, 'Google login successful', result);
  } catch (error) {
    next(error);
  }
};

// ─── Password Reset ───────────────────────────────────────────────────────────

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    return successResponse(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const result = await authService.resetPassword(token, password);
    return successResponse(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

// ─── Token & Session ──────────────────────────────────────────────────────────

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return errorResponse(res, 400, 'Refresh token required');
    const result = await authService.refreshAccessToken(refreshToken);
    return successResponse(res, 200, 'Token refreshed', result);
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(req.user._id, refreshToken);
    return successResponse(res, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

const logoutAll = async (req, res, next) => {
  try {
    await authService.logoutAll(req.user._id);
    return successResponse(res, 200, 'Logged out from all devices');
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res) => {
  return successResponse(res, 200, 'Profile fetched', { user: req.user.toSafeObject() });
};

module.exports = {
  sendOTP,
  verifyOTP,
  register,
  login,
  verifyEmail,
  googleLogin,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  logoutAll,
  getMe,
};
