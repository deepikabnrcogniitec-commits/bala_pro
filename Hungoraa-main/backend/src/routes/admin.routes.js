const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { uploadFields, uploadSingle, uploadVideo } = require('../config/upload');
const {
  getDashboard, getStats,
  uploadAsset,
  getAllUsers, getUserById, toggleBlockUser, deleteUser, resetUserPassword,
  createRestaurantWithOwner,
  getAllRestaurantsAdmin, getRestaurantByIdAdmin, approveRestaurant, rejectRestaurant,
  updateCommission, updateSubscription, toggleBlockRestaurant, deleteRestaurant,
  updateRestaurantAdmin, updateRestaurantPolicy,
  getAllBookingsAdmin,
  getAllReviewsAdmin, deleteReview,
  getAllPayments,
  sendBulkNotification, getNotificationHistory,
  getSettings, updateSettings,
  // New dashboards
  getCommissionDashboard,
  getSettlementDashboard,
  getPendingOffers,
  getDiscountAnalytics,
  getRevenueAnalytics,
} = require('../controllers/admin.controller');

router.use(protect, authorize('admin'));

// ── Platform Dashboard ─────────────────────────────────────────────────────────
router.get('/dashboard', getDashboard);
router.get('/stats', getStats);

// ── Users ──────────────────────────────────────────────────────────────────────
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/block', toggleBlockUser);
router.patch('/users/:id/reset-password', resetUserPassword);
router.delete('/users/:id', deleteUser);

// ── Restaurants ────────────────────────────────────────────────────────────────
router.post(
  '/restaurants/create',
  uploadFields('restaurant-docs', [
    { name: 'fssaiDoc', maxCount: 1 },
    { name: 'panDoc', maxCount: 1 },
    { name: 'aadharDoc', maxCount: 1 },
  ]),
  createRestaurantWithOwner
);
router.get('/restaurants', getAllRestaurantsAdmin);
router.get('/restaurants/:id', getRestaurantByIdAdmin);
router.put('/restaurants/:id', updateRestaurantAdmin);
router.patch('/restaurants/:id/approve', approveRestaurant);
router.patch('/restaurants/:id/reject', rejectRestaurant);
router.patch('/restaurants/:id/commission', updateCommission);
router.patch('/restaurants/:id/subscription', updateSubscription);
router.patch('/restaurants/:id/policy', updateRestaurantPolicy);   // commission + cycle + discountPolicy
router.patch('/restaurants/:id/block', toggleBlockRestaurant);
router.delete('/restaurants/:id', deleteRestaurant);

// ── Bookings ───────────────────────────────────────────────────────────────────
router.get('/bookings', getAllBookingsAdmin);

// ── Reviews ────────────────────────────────────────────────────────────────────
router.get('/reviews', getAllReviewsAdmin);
router.delete('/reviews/:id', deleteReview);

// ── Payments ───────────────────────────────────────────────────────────────────
router.get('/payments', getAllPayments);

// ── Offers — Approval Queue ────────────────────────────────────────────────────
router.get('/offers/pending', getPendingOffers);

// ── Commission Dashboard ───────────────────────────────────────────────────────
router.get('/commissions', getCommissionDashboard);

// ── Settlement Dashboard ───────────────────────────────────────────────────────
router.get('/settlements', getSettlementDashboard);

// ── Analytics ──────────────────────────────────────────────────────────────────
router.get('/analytics/discounts', getDiscountAnalytics);
router.get('/analytics/revenue', getRevenueAnalytics);

// ── Notifications ──────────────────────────────────────────────────────────────
router.post('/notifications/bulk', sendBulkNotification);
router.get('/notifications', getNotificationHistory);

// ── Settings ───────────────────────────────────────────────────────────────────
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Generic image upload for platform assets (e.g. the home hero background)
router.post('/upload', uploadSingle('platform', 'image'), uploadAsset);
router.post('/upload-video', uploadVideo('platform', 'video'), uploadAsset);

module.exports = router;
