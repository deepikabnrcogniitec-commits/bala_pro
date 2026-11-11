const { body } = require('express-validator');

const sendOTPValidator = [
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .customSanitizer((v) => v.replace(/\s+/g, ''))
    .matches(/^\+?[1-9]\d{9,14}$/).withMessage('Invalid phone number format'),
];

const verifyOTPValidator = [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),
];

const registerValidator = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .toLowerCase().trim(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('phone')
    .optional({ checkFalsy: true })
    .customSanitizer((v) => v.replace(/\s+/g, ''))
    .matches(/^\+?[1-9]\d{9,14}$/).withMessage('Invalid phone number'),
  body('role').optional().isIn(['customer', 'owner']).withMessage('Invalid role'),
];

const loginValidator = [
  body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email').toLowerCase().trim(),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidator = [
  body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email'),
];

const resetPasswordValidator = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((val, { req }) => {
      if (val !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
];

const googleAuthValidator = [
  body('idToken').notEmpty().withMessage('Google ID token is required'),
];

module.exports = {
  sendOTPValidator,
  verifyOTPValidator,
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  googleAuthValidator,
};
