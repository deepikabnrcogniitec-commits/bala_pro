const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const { addReview, getRestaurantReviews, getMyReviews, ownerReply } = require('../controllers/review.controller');

router.get('/reviews/my', protect, authorize('customer'), getMyReviews);
router.post('/restaurants/:restaurantId/reviews', protect, authorize('customer'), addReview);
router.get('/restaurants/:restaurantId/reviews', getRestaurantReviews);
router.post('/reviews/:reviewId/reply', protect, authorize('owner', 'admin'), ownerReply);

module.exports = router;
