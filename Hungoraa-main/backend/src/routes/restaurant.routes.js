const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/restaurant.controller');
const bookingCtrl = require('../controllers/booking.controller');
const menuCtrl = require('../controllers/menu.controller');
const reviewCtrl = require('../controllers/review.controller');
const { protect, authorize, optionalAuth } = require('../middleware/auth.middleware');
const { uploadImageFields } = require('../config/upload');

// Restaurant photos: up to 10 cover images + 1 logo
const restaurantImages = uploadImageFields('restaurants', [
  { name: 'images', maxCount: 10 },
  { name: 'logo', maxCount: 1 },
]);

// ─── Named static routes first (before /:id wildcard) ────────────────────────
router.get('/nearby', ctrl.getNearbyRestaurants);
router.get('/featured', ctrl.getFeaturedRestaurants);
router.get('/trending', ctrl.getTrendingRestaurants);
router.get('/cities', ctrl.getRestaurantCities);
router.get('/search', ctrl.searchRestaurants);

// ─── Owner-only named routes (protected, before /:id) ────────────────────────
router.get('/owner/my', protect, authorize('owner', 'admin'), ctrl.getMyRestaurants);
router.get('/owner/dashboard', protect, authorize('owner', 'admin'), ctrl.getOwnerDashboard);
router.get('/owner/analytics', protect, authorize('owner', 'admin'), ctrl.getOwnerAnalytics);

// ─── Public list + detail ────────────────────────────────────────────────────
router.get('/', optionalAuth, ctrl.getAllRestaurants);
router.get('/:id', ctrl.getRestaurantById);
router.get('/:id/menu', menuCtrl.getMenu);
router.get('/:id/availability', bookingCtrl.getAvailability);
router.get('/:id/reviews', reviewCtrl.getRestaurantReviews);

// ─── Authenticated routes ─────────────────────────────────────────────────────
router.post('/:id/save', protect, authorize('customer'), ctrl.toggleSaveRestaurant);

router.post(
  '/',
  protect,
  authorize('owner', 'admin'),
  restaurantImages,
  ctrl.createRestaurant
);
router.put(
  '/:id',
  protect,
  authorize('owner', 'admin'),
  restaurantImages,
  ctrl.updateRestaurant
);
router.delete('/:id', protect, authorize('owner', 'admin'), ctrl.deleteRestaurant);

module.exports = router;
