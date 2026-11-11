const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { uploadSingle } = require('../config/upload');

router.use(protect);

// Profile
router.get('/me', ctrl.getMe);
router.put('/me', uploadSingle('avatars', 'avatar'), ctrl.updateProfile);
router.put('/me/password', ctrl.changePassword);
router.delete('/me', ctrl.deleteAccount);

// FCM tokens
router.post('/me/fcm-token', ctrl.updateFCMToken);
router.delete('/me/fcm-token', ctrl.removeFCMToken);

// Saved restaurants
router.get('/saved-restaurants', authorize('customer'), ctrl.getSavedRestaurants);

// Addresses
router.post('/me/addresses', ctrl.addAddress);
router.put('/me/addresses/:addressId', ctrl.updateAddress);
router.delete('/me/addresses/:addressId', ctrl.deleteAddress);

module.exports = router;
