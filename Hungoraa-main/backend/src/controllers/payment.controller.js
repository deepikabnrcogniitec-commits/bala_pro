const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Wallet = require('../models/Wallet');
const Restaurant = require('../models/Restaurant');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const User = require('../models/User');
const BillPayment = require('../models/BillPayment');
const { finalizeBillPayment } = require('./billPayment.controller');
const { verifyPaymentSignature, verifyWebhookSignature } = require('../utils/razorpay');
const { refundCapturedPayment } = require('../services/depositRefund.service');
const { successResponse, errorResponse } = require('../utils/response');

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured');
  }
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// Checkout signature check (timing-safe) lives in utils/razorpay.js.
const verifySignature = verifyPaymentSignature;

// A held booking can only be paid for while its 5-minute hold is still running.
const isHoldExpired = (booking) =>
  booking.status === 'held' && (!booking.holdExpiresAt || booking.holdExpiresAt <= new Date());
const HOLD_EXPIRED_MESSAGE = 'Your 5-minute table hold has expired. Please select the time again.';

// Moves a payment to "completed" only if it is not completed yet. It returns the document only when
// THIS call made the change, so the app's verify call and the webhook can never both credit a wallet
// or confirm a booking.
const markPaymentCompleted = (filter, fields) =>
  Payment.findOneAndUpdate(
    { ...filter, status: { $ne: 'completed' } },
    { ...fields, status: 'completed', paidAt: new Date() },
    { new: true }
  );

// Confirms a deposit-paid booking. Safe to call repeatedly: it changes the booking only once.
const confirmBookingDeposit = async (bookingId, paymentDoc, actorId, reason) => {
  const booking = await Booking.findById(bookingId).populate('restaurant', 'owner name');
  if (!booking) return { confirmed: false, reason: 'booking_not_found' };
  if (booking.isPaid) return { confirmed: false, reason: 'already_paid', booking };

  // A hold released because an earlier attempt failed can be revived by a successful retry on the same order.
  const revivable = booking.status === 'cancelled' && booking.cancellationReason === 'Deposit payment failed';
  if (booking.status === 'cancelled' && !revivable) {
    // The money was captured for a booking that is no longer held (hold expired or booking cancelled).
    // Refund it automatically. If the refund call itself fails, flag it for manual action.
    try {
      await refundCapturedPayment(paymentDoc, 'Booking was not confirmed before payment completed');
      return { confirmed: false, reason: 'booking_cancelled_refunded', booking };
    } catch (err) {
      logger.error(`Auto-refund failed for payment ${paymentDoc._id} on cancelled booking ${booking._id}: ${err.message}. Manual refund needed.`);
      return { confirmed: false, reason: 'booking_cancelled', booking };
    }
  }

  const nextStatus = booking.status === 'held' || revivable ? 'pending' : booking.status;
  booking.isPaid = true;
  booking.payment = paymentDoc._id;
  booking.status = nextStatus;
  booking.holdStatus = 'confirmed';
  if (revivable) {
    booking.cancelledAt = undefined;
    booking.cancellationReason = undefined;
  }
  booking.statusHistory.push({ status: nextStatus, changedBy: actorId || undefined, reason });
  await booking.save();

  try {
    await Notification.create({
      recipient: booking.restaurant.owner,
      title:     'Deposit Received',
      body:      `Deposit of ₹${paymentDoc.amount} received for booking #${booking.bookingId}`,
      type:      'deposit_received',
      data:      { bookingId: booking._id, paymentId: paymentDoc._id, amount: paymentDoc.amount },
      channel:   'in-app',
    });
  } catch (err) {
    logger.error('Deposit notification failed (payment is still confirmed):', err.message);
  }

  return { confirmed: true, booking };
};

// ─── Customer: Create Razorpay order for booking deposit ──────────────────────
exports.createOrder = async (req, res) => {
  try {
    const { bookingId, amount, type = 'deposit' } = req.body;

    const booking = await Booking.findById(bookingId).populate('restaurant', 'name commission bookingSettings');
    if (!booking) return errorResponse(res, 404, 'Booking not found');
    if (booking.customer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized');
    }
    if (booking.isPaid) return errorResponse(res, 400, 'Booking already paid');
    if (!['held', 'pending', 'confirmed'].includes(booking.status)) {
      return errorResponse(res, 400, `Cannot pay for a booking with status "${booking.status}"`);
    }
    if (isHoldExpired(booking)) return errorResponse(res, 400, HOLD_EXPIRED_MESSAGE);

    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) return errorResponse(res, 400, 'Invalid amount');
    if (type !== 'deposit') return errorResponse(res, 400, 'Only deposit payments are supported here');

    // The amount must be exactly the deposit set by the restaurant, so the client cannot pay less.
    const expectedDeposit = booking.depositAmount || booking.restaurant?.bookingSettings?.depositAmount || 0;
    if (!expectedDeposit) return errorResponse(res, 400, 'This booking has no deposit to pay');
    if (payAmount !== expectedDeposit) {
      return errorResponse(res, 400, `Amount must equal the booking deposit of ₹${expectedDeposit}`);
    }

    const order = await getRazorpay().orders.create({
      amount:   Math.round(payAmount * 100),
      currency: 'INR',
      receipt:  `bk_${booking.bookingId}_${Date.now()}`,
      notes:    { bookingId: bookingId.toString(), customerId: req.user._id.toString() },
    });

    const payment = await Payment.create({
      booking:         bookingId,
      customer:        req.user._id,
      restaurant:      booking.restaurant._id,
      amount:          payAmount,
      method:          'razorpay',
      type,
      status:          'pending',
      razorpayOrderId: order.id,
      receipt:         order.receipt,
      description:     `Booking deposit – ${booking.restaurant.name}`,
    });

    return successResponse(res, 200, 'Order created', {
      orderId:   order.id,
      amount:    order.amount,
      currency:  order.currency,
      key:       process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id,
    });
  } catch (err) {
    logger.error('createOrder error:', err);
    return errorResponse(res, 500, err.message);
  }
};

// ─── Customer: Verify Razorpay payment + confirm booking ──────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return errorResponse(res, 400, 'razorpayOrderId, razorpayPaymentId and razorpaySignature are required');
    }

    // Only the customer who created this order may verify it.
    const payment = await Payment.findOne({ razorpayOrderId, customer: req.user._id, type: 'deposit' });
    if (!payment) return errorResponse(res, 404, 'Payment record not found');

    if (!verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      // Only a still-pending payment is marked failed. A completed payment is never overwritten.
      await Payment.updateOne(
        { _id: payment._id, status: 'pending' },
        { status: 'failed', failureReason: 'Signature mismatch' }
      );
      return errorResponse(res, 400, 'Invalid payment signature');
    }

    if (bookingId && String(bookingId) !== String(payment.booking)) {
      return errorResponse(res, 400, 'bookingId does not belong to this payment');
    }

    const transitioned = await markPaymentCompleted({ _id: payment._id }, { razorpayPaymentId, razorpaySignature });
    const current = transitioned || (await Payment.findById(payment._id));

    // Idempotent: also re-runs safely if the webhook already completed the payment.
    const result = await confirmBookingDeposit(payment.booking, current, req.user._id, 'Deposit paid');
    if (result.reason === 'booking_not_found') return errorResponse(res, 404, 'Booking not found');
    if (result.reason === 'booking_cancelled_refunded') {
      return errorResponse(res, 409, 'The table hold had already expired, so your payment has been refunded.');
    }
    if (result.reason === 'booking_cancelled') {
      return errorResponse(res, 409, 'Payment captured but the booking was cancelled. Support will refund the deposit.');
    }

    return successResponse(res, 200, transitioned ? 'Payment verified' : 'Payment already verified', {
      payment: current,
      booking: result.booking
        ? { _id: result.booking._id, bookingId: result.booking.bookingId, status: result.booking.status, isPaid: result.booking.isPaid }
        : null,
    });
  } catch (err) {
    logger.error('verifyPayment error:', err);
    return errorResponse(res, 500, err.message);
  }
};

// ─── Customer: Pay booking deposit via wallet ─────────────────────────────────
exports.payWithWallet = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;
    if (!bookingId || !amount) return errorResponse(res, 400, 'bookingId and amount are required');

    const booking = await Booking.findById(bookingId).populate('restaurant', 'owner name commission');
    if (!booking) return errorResponse(res, 404, 'Booking not found');
    if (booking.customer.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Not authorized');
    }
    if (booking.isPaid) return errorResponse(res, 400, 'Booking already paid');
    if (!['held', 'pending', 'confirmed'].includes(booking.status)) {
      return errorResponse(res, 400, `Cannot pay for a booking with status "${booking.status}"`);
    }
    if (isHoldExpired(booking)) return errorResponse(res, 400, HOLD_EXPIRED_MESSAGE);

    const payAmount = parseFloat(amount);
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) return errorResponse(res, 404, 'Wallet not found');
    if (wallet.balance < payAmount) {
      return errorResponse(res, 400, `Insufficient balance. Available: ₹${wallet.balance}`);
    }

    await wallet.debit(payAmount, `Booking deposit – ${booking.restaurant.name}`, bookingId, 'booking');

    const payment = await Payment.create({
      booking:     bookingId,
      customer:    req.user._id,
      restaurant:  booking.restaurant._id,
      amount:      payAmount,
      method:      'wallet',
      type:        'deposit',
      status:      'completed',
      paidAt:      new Date(),
      description: `Booking deposit – ${booking.restaurant.name}`,
    });

    const nextStatus = booking.status === 'held' ? 'pending' : booking.status;
    booking.isPaid     = true;
    booking.payment    = payment._id;
    booking.status     = nextStatus;
    booking.holdStatus = 'confirmed';
    booking.statusHistory.push({ status: nextStatus, changedBy: req.user._id, reason: 'Deposit paid via wallet' });
    await booking.save();

    // Notify owner
    await Notification.create({
      recipient: booking.restaurant.owner,
      title:     'Deposit Received',
      body:      `Deposit of ₹${payAmount} received (wallet) for booking #${booking.bookingId}`,
      type:      'deposit_received',
      data:      { bookingId: booking._id, paymentId: payment._id, amount: payAmount },
      channel:   'in-app',
    });

    return successResponse(res, 200, 'Payment successful', { payment, walletBalance: wallet.balance });
  } catch (err) {
    logger.error('payWithWallet error:', err);
    return errorResponse(res, 500, err.message);
  }
};

// ─── Customer: Create Razorpay order for wallet top-up ───────────────────────
exports.createWalletTopupOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const topupAmount = parseFloat(amount);
    if (!topupAmount || topupAmount < 1) return errorResponse(res, 400, 'Minimum top-up is ₹1');

    const order = await getRazorpay().orders.create({
      amount:   Math.round(topupAmount * 100),
      currency: 'INR',
      receipt:  `wallet_${req.user._id}_${Date.now()}`,
      notes:    { purpose: 'wallet_topup', customerId: req.user._id.toString() },
    });

    const payment = await Payment.create({
      customer:        req.user._id,
      amount:          topupAmount,
      method:          'razorpay',
      type:            'wallet_topup',
      status:          'pending',
      razorpayOrderId: order.id,
      receipt:         order.receipt,
      description:     'Wallet top-up',
    });

    return successResponse(res, 200, 'Top-up order created', {
      orderId:   order.id,
      amount:    order.amount,
      currency:  order.currency,
      key:       process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id,
    });
  } catch (err) {
    logger.error('createWalletTopupOrder error:', err);
    return errorResponse(res, 500, err.message);
  }
};

// ─── Customer: Verify wallet top-up payment + credit wallet ───────────────────
exports.topUpWallet = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return errorResponse(res, 400, 'razorpayOrderId, razorpayPaymentId and razorpaySignature are required');
    }

    const payment = await Payment.findOne({ razorpayOrderId, customer: req.user._id, type: 'wallet_topup' });
    if (!payment) return errorResponse(res, 404, 'Payment record not found');

    if (!verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      await Payment.updateOne(
        { _id: payment._id, status: 'pending' },
        { status: 'failed', failureReason: 'Signature mismatch' }
      );
      return errorResponse(res, 400, 'Invalid payment signature');
    }

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) return errorResponse(res, 404, 'Wallet not found');

    const transitioned = await markPaymentCompleted({ _id: payment._id }, { razorpayPaymentId, razorpaySignature });
    if (!transitioned) {
      // Already credited by an earlier verify or by the webhook.
      return successResponse(res, 200, 'Wallet top-up already applied', { payment, newBalance: wallet.balance });
    }

    await wallet.credit(transitioned.amount, 'Wallet top-up via Razorpay', transitioned._id.toString(), 'topup');
    return successResponse(res, 200, 'Wallet topped up', {
      payment: transitioned,
      newBalance: wallet.balance,
    });
  } catch (err) {
    logger.error('topUpWallet error:', err);
    return errorResponse(res, 500, err.message);
  }
};

// ─── Customer / Owner / Admin: Get single payment ─────────────────────────────
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('booking',    'bookingId date time status')
      .populate('restaurant', 'name address')
      .populate('customer',   'name email phone');

    if (!payment) return errorResponse(res, 404, 'Payment not found');

    const isOwner    = req.user.role === 'admin' || req.user.role === 'owner';
    const isCustomer = payment.customer._id.toString() === req.user._id.toString();
    if (!isOwner && !isCustomer) return errorResponse(res, 403, 'Access denied');

    return successResponse(res, 200, 'Payment fetched', { payment });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── Customer: Payment history with pagination + filters ──────────────────────
exports.getPaymentHistory = async (req, res) => {
  try {
    const { status, type, from, to, page = 1, limit = 20 } = req.query;

    const filter = { customer: req.user._id };
    if (status) filter.status = status;
    if (type)   filter.type   = type;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('booking',    'bookingId date time')
        .populate('restaurant', 'name images logo')
        .sort('-createdAt')
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit)),
      Payment.countDocuments(filter),
    ]);

    return successResponse(res, 200, 'Payment history', {
      payments,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── Customer: Wallet balance + recent transactions ───────────────────────────
exports.getWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) return errorResponse(res, 404, 'Wallet not found');

    // Return wallet without full transaction history (use /wallet/transactions for that)
    const { transactions, ...walletData } = wallet.toObject();
    return successResponse(res, 200, 'Wallet fetched', {
      wallet: {
        ...walletData,
        recentTransactions: transactions.slice(-5).reverse(),
      },
    });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── Customer: Paginated wallet transaction history ───────────────────────────
exports.getWalletTransactions = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) return errorResponse(res, 404, 'Wallet not found');

    let transactions = [...wallet.transactions].reverse(); // newest first
    if (type) transactions = transactions.filter((t) => t.type === type);

    const total = transactions.length;
    const paginated = transactions.slice(
      (parseInt(page) - 1) * parseInt(limit),
      parseInt(page) * parseInt(limit)
    );

    return successResponse(res, 200, 'Wallet transactions', {
      balance: wallet.balance,
      transactions: paginated,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── Owner / Admin: Initiate Razorpay refund ──────────────────────────────────
exports.refundPayment = async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) return errorResponse(res, 404, 'Payment not found');
    if (!['completed', 'partially_refunded'].includes(payment.status)) {
      return errorResponse(res, 400, 'Only captured payments can be refunded');
    }
    if (!payment.razorpayPaymentId) return errorResponse(res, 400, 'No Razorpay payment ID on record');

    const alreadyRefunded = payment.refundAmount || 0;
    const refundable = Math.round((payment.amount - alreadyRefunded) * 100) / 100;
    const refundAmount = amount ? parseFloat(amount) : refundable;
    if (!(refundAmount > 0) || refundAmount > refundable) {
      return errorResponse(res, 400, `Refund amount must be more than ₹0 and at most ₹${refundable}`);
    }

    const refund = await getRazorpay().payments.refund(payment.razorpayPaymentId, {
      amount: Math.round(refundAmount * 100),
      notes:  { reason: reason || 'Booking cancellation' },
    });

    const totalRefunded = Math.round((alreadyRefunded + refundAmount) * 100) / 100;
    const isPartial = totalRefunded < payment.amount;
    payment.status        = isPartial ? 'partially_refunded' : 'refunded';
    payment.refundAmount  = totalRefunded;
    payment.refundId      = refund.id;
    payment.refundedAt    = new Date();
    payment.refundReason  = reason;
    await payment.save();

    // Notify customer
    await Notification.create({
      recipient: payment.customer,
      title:     'Refund Initiated',
      body:      `₹${refundAmount} refund has been processed. It will reflect in 5–7 business days.`,
      type:      'refund_completed',
      data:      { paymentId: payment._id, refundAmount, refundId: refund.id },
      channel:   'in-app',
    });

    return successResponse(res, 200, 'Refund initiated', { payment, refund });
  } catch (err) {
    logger.error('refundPayment error:', err);
    return errorResponse(res, 500, err.message);
  }
};

// ─── Admin: Refund to wallet (when Razorpay refund not applicable) ────────────
exports.refundToWallet = async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) return errorResponse(res, 404, 'Payment not found');
    if (payment.status !== 'completed') return errorResponse(res, 400, 'Only completed payments can be refunded');

    const refundAmount = amount ? parseFloat(amount) : payment.amount;
    if (refundAmount > payment.amount) return errorResponse(res, 400, 'Refund amount exceeds payment amount');

    const wallet = await Wallet.findOne({ user: payment.customer });
    if (!wallet) return errorResponse(res, 404, 'Customer wallet not found');

    await wallet.credit(refundAmount, reason || 'Refund', payment._id.toString(), 'refund');

    const isPartial = refundAmount < payment.amount;
    payment.status       = isPartial ? 'partially_refunded' : 'refunded';
    payment.refundAmount = refundAmount;
    payment.refundedAt   = new Date();
    payment.refundReason = reason;
    await payment.save();

    await Notification.create({
      recipient: payment.customer,
      title:     'Refund Credited to Wallet',
      body:      `₹${refundAmount} has been refunded to your DineSmart wallet`,
      type:      'refund_completed',
      data:      { paymentId: payment._id, refundAmount, walletBalance: wallet.balance },
      channel:   'in-app',
    });

    return successResponse(res, 200, 'Refund credited to wallet', { payment, newWalletBalance: wallet.balance });
  } catch (err) {
    logger.error('refundToWallet error:', err);
    return errorResponse(res, 500, err.message);
  }
};

// ─── Razorpay Webhook ─────────────────────────────────────────────────────────
// Mounted in payment.routes.js with express.raw(), and app.js skips the JSON parser for this path,
// so req.body is the untouched Buffer that Razorpay signed.
exports.razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      logger.error('RAZORPAY_WEBHOOK_SECRET is not set; webhook rejected');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }
    if (!Buffer.isBuffer(req.body)) {
      logger.error('Webhook body is not raw; check the route and the JSON parser skip in app.js');
      return res.status(400).json({ error: 'Raw body required' });
    }
    if (!verifyWebhookSignature(req.body, req.headers['x-razorpay-signature'], secret)) {
      logger.warn('Webhook: invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(req.body.toString('utf8'));
    const paymentEntity = event.payload?.payment?.entity;
    const refundEntity = event.payload?.refund?.entity;
    const orderId = paymentEntity?.order_id;

    switch (event.event) {
      case 'payment.captured': {
        if (!orderId) break;
        const payment = await Payment.findOne({ razorpayOrderId: orderId });
        if (payment) {
          const transitioned = await markPaymentCompleted({ _id: payment._id }, { razorpayPaymentId: paymentEntity.id });
          if (payment.type === 'wallet_topup') {
            if (transitioned) {
              const wallet = await Wallet.findOne({ user: payment.customer });
              if (wallet) {
                await wallet.credit(transitioned.amount, 'Wallet top-up via Razorpay', transitioned._id.toString(), 'topup');
              } else {
                logger.error(`Wallet missing for captured top-up payment ${payment._id}`);
              }
            }
          } else if (payment.booking) {
            // Idempotent: confirms the booking even if the app's verify call never arrived.
            await confirmBookingDeposit(payment.booking, transitioned || payment, null, 'Deposit paid (webhook)');
          }
          break;
        }

        // Not a booking or wallet payment, so check bill payments.
        const bill = await BillPayment.findOne({ razorpayOrderId: orderId });
        if (bill && bill.paymentStatus !== 'paid') {
          const customer = await User.findById(bill.customer);
          await finalizeBillPayment(bill._id, { razorpayPaymentId: paymentEntity.id, customer });
        }
        break;
      }

      case 'payment.failed': {
        if (!orderId) break;
        // Never mark a completed payment as failed.
        const payment = await Payment.findOneAndUpdate(
          { razorpayOrderId: orderId, status: { $ne: 'completed' } },
          { status: 'failed', failureReason: paymentEntity.error_description || 'Payment failed' },
          { new: true }
        );
        if (!payment) break;

        try {
          await Notification.create({
            recipient: payment.customer,
            title:     'Payment Failed',
            body:      `Your payment of ₹${payment.amount} failed. Please try again.`,
            type:      'payment_failed',
            data:      { paymentId: payment._id, amount: payment.amount },
            channel:   'in-app',
          });
        } catch (err) {
          logger.error('Payment-failed notification error:', err.message);
        }

        // Release the hold only if the deposit was never paid. A later successful retry can revive it.
        if (payment.booking) {
          await Booking.findOneAndUpdate(
            { _id: payment.booking, status: 'held', isPaid: false },
            {
              status:             'cancelled',
              holdStatus:         'released',
              cancelledAt:        new Date(),
              cancellationReason: 'Deposit payment failed',
            }
          );
        }
        break;
      }

      case 'refund.processed': {
        if (!refundEntity?.payment_id) break;
        const payment = await Payment.findOne({ razorpayPaymentId: refundEntity.payment_id });
        // Refunds made through our API already store their refund id, so only refunds made outside
        // the app (for example from the Razorpay dashboard) are recorded here.
        if (payment && !payment.refundId) {
          const refunded = (refundEntity.amount || 0) / 100; // Razorpay amounts are in paise
          const total = Math.round(((payment.refundAmount || 0) + refunded) * 100) / 100;
          payment.status = total >= payment.amount ? 'refunded' : 'partially_refunded';
          payment.refundAmount = total;
          payment.refundId = refundEntity.id;
          payment.refundedAt = new Date();
          await payment.save();
        }
        break;
      }

      default:
        logger.info(`Unhandled webhook event: ${event.event}`);
    }

    return res.json({ status: 'ok' });
  } catch (err) {
    logger.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
};
