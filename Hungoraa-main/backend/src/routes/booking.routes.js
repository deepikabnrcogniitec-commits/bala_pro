const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/booking.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

// Customer — hold flow (Step 1: lock table for 5 min)
router.post('/hold', authorize('customer'), ctrl.holdBooking);
router.delete('/hold/:id', authorize('customer'), ctrl.releaseHold);

// Customer — confirm booking (Step 2: after deposit or for no-deposit flow)
router.post('/', authorize('customer'), ctrl.createBooking);
router.get('/my', authorize('customer'), ctrl.getMyBookings);
router.patch('/:id/cancel', authorize('customer'), ctrl.cancelBooking);
router.patch('/:id/reschedule', authorize('customer'), ctrl.rescheduleBooking);

// Owner / Admin
router.get('/restaurant', authorize('owner', 'admin'), ctrl.getRestaurantBookings);
router.get('/today', authorize('owner', 'admin'), ctrl.getTodaysBookings);
router.patch('/:id/status', authorize('owner', 'admin', 'staff'), ctrl.updateBookingStatus);

// Customer: review after completed booking
const { addReview } = require('../controllers/review.controller');
router.post('/:id/review', authorize('customer'), (req, res, next) => {
  req.body.bookingId = req.params.id;
  next();
}, addReview);

// All authenticated
router.get('/:id', ctrl.getBookingById);

module.exports = router;
