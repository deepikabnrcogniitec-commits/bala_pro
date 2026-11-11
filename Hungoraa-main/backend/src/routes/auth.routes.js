const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
  sendOTPValidator,
  verifyOTPValidator,
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  googleAuthValidator,
} = require('../validators/auth.validators');

// Rate limiters
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 3,
  message: { success: false, message: 'Too many OTP requests. Please wait 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Phone OTP ──────────────────────────────────────────────────────────────
router.post('/send-otp', otpLimiter, sendOTPValidator, validate, authController.sendOTP);
router.post('/verify-otp', otpLimiter, verifyOTPValidator, validate, authController.verifyOTP);

// ─── Email Auth ─────────────────────────────────────────────────────────────
router.post('/register', registerValidator, validate, authController.register);
router.post('/login', loginLimiter, loginValidator, validate, authController.login);
router.get('/verify-email/:token', authController.verifyEmail);

// ─── Google OAuth ────────────────────────────────────────────────────────────
router.post('/google', googleAuthValidator, validate, authController.googleLogin);

// ─── Password Reset ──────────────────────────────────────────────────────────
router.post('/forgot-password', forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/reset-password/:token', resetPasswordValidator, validate, authController.resetPassword);

// ─── Token & Session ─────────────────────────────────────────────────────────
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', protect, authController.logout);
router.post('/logout-all', protect, authController.logoutAll);
router.get('/me', protect, authController.getMe);

module.exports = router;
