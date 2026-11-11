const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const {
  createOrder,
  verifyPayment,
  payWithWallet,
  createWalletTopupOrder,
  topUpWallet,
  getPaymentById,
  getPaymentHistory,
  getWallet,
  getWalletTransactions,
  refundPayment,
  refundToWallet,
  razorpayWebhook,
} = require('../controllers/payment.controller');

// ── Razorpay webhook — raw body, no auth ──────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);

router.use(protect);

// ── Booking payment ───────────────────────────────────────────────────────────
router.post('/create-order', createOrder);             // create Razorpay order for deposit
router.post('/verify',       verifyPayment);           // verify signature + confirm booking

// ── Wallet payments ───────────────────────────────────────────────────────────
router.post('/wallet/pay',         payWithWallet);          // pay booking deposit via wallet
router.post('/wallet/topup-order', createWalletTopupOrder); // create Razorpay order for top-up
router.post('/wallet/topup',       topUpWallet);            // verify top-up payment + credit wallet

// ── Wallet info ───────────────────────────────────────────────────────────────
router.get('/wallet',               getWallet);              // balance + last 5 transactions
router.get('/wallet/transactions',  getWalletTransactions);  // full paginated history (?type=credit|debit)

// ── Payment records ───────────────────────────────────────────────────────────
router.get('/history', getPaymentHistory);   // ?status=&type=&from=&to=&page=&limit=
router.get('/:id',     getPaymentById);

// ── Refunds (owner / admin) ───────────────────────────────────────────────────
router.post('/:id/refund',          authorize('owner', 'admin'), refundPayment);    // Razorpay refund
router.post('/:id/refund-to-wallet', authorize('admin'),         refundToWallet);   // wallet credit refund

module.exports = router;
