const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/offer.controller');
const { protect, authorize, optionalAuth } = require('../middleware/auth.middleware');
const { uploadSingle } = require('../config/upload');

// Public / Customer
router.get('/', optionalAuth, ctrl.getAllOffers);
router.get('/restaurant/:restaurantId', optionalAuth, ctrl.getRestaurantOffers);
router.post('/validate-coupon', protect, authorize('customer'), ctrl.validateCoupon);

// Admin — full offer console (list every offer, any status)
router.get('/admin/all', protect, authorize('admin'), ctrl.adminListOffers);

// Owner / Admin — upload a banner image, returns { url, publicId }
router.post(
  '/upload-image',
  protect,
  authorize('owner', 'admin'),
  uploadSingle('offers', 'image'),
  ctrl.uploadOfferImage,
);

// Owner — create / edit
router.post('/', protect, authorize('owner', 'admin'), ctrl.createOffer);
router.put('/:id', protect, authorize('owner', 'admin'), ctrl.updateOffer);
router.delete('/:id', protect, authorize('owner', 'admin'), ctrl.deleteOffer);

// Owner — submit for approval
router.patch('/:id/submit', protect, authorize('owner'), ctrl.submitForApproval);

// Admin — approval actions
router.patch('/:id/approve', protect, authorize('admin'), ctrl.approveOffer);
router.patch('/:id/reject', protect, authorize('admin'), ctrl.rejectOffer);

// Owner / Admin — usage analytics
router.get('/:id/usage', protect, authorize('owner', 'admin'), ctrl.getOfferUsage);

module.exports = router;
