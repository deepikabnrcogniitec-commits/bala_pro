const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  generateInvoice, lockInvoice, markInvoicePaid,
  getRestaurantInvoices, getInvoice, getInvoiceByBooking,
  cancelInvoice, getAllInvoices,
} = require('../controllers/invoice.controller');

router.use(protect);

// Owner
router.post('/', authorize('owner', 'admin'), generateInvoice);
router.get('/restaurant', authorize('owner', 'admin'), getRestaurantInvoices);
router.patch('/:id/lock', authorize('owner', 'admin'), lockInvoice);
router.patch('/:id/pay', authorize('owner', 'admin'), markInvoicePaid);
router.patch('/:id/cancel', authorize('owner', 'admin'), cancelInvoice);

// Customer
router.get('/booking/:bookingId', authorize('customer', 'owner', 'admin'), getInvoiceByBooking);

// Admin
router.get('/all', authorize('admin'), getAllInvoices);

// Shared
router.get('/:id', getInvoice);

module.exports = router;
