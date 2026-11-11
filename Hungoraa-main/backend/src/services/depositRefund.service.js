const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Wallet = require('../models/Wallet');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

const razorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// Refunds one captured payment in full. Razorpay payments go back through Razorpay; wallet payments are
// credited back to the customer's wallet. Only a completed payment can be refunded, and a repeat call on
// an already refunded payment does nothing, so retries are safe.
const refundCapturedPayment = async (payment, reason) => {
  if (payment.status === 'refunded') return payment;
  if (payment.status !== 'completed') {
    throw new Error(`Payment ${payment._id} is not captured (status: ${payment.status})`);
  }

  if (payment.method === 'wallet') {
    const wallet = await Wallet.findOne({ user: payment.customer });
    if (!wallet) throw new Error(`Wallet not found for customer ${payment.customer}`);
    await wallet.credit(payment.amount, reason || 'Booking deposit refund', payment._id.toString(), 'refund');
  } else if (payment.method === 'razorpay') {
    if (!payment.razorpayPaymentId) throw new Error(`Payment ${payment._id} has no Razorpay payment id`);
    const refund = await razorpayClient().payments.refund(payment.razorpayPaymentId, {
      amount: Math.round(payment.amount * 100), // paise
      notes: { reason: reason || 'Booking refund' },
    });
    payment.refundId = refund.id;
  } else {
    throw new Error(`Payment method "${payment.method}" cannot be refunded automatically`);
  }

  payment.status = 'refunded';
  payment.refundAmount = payment.amount;
  payment.refundedAt = new Date();
  payment.refundReason = reason;
  await payment.save();

  try {
    await Notification.create({
      recipient: payment.customer,
      title: 'Refund Initiated',
      body: `₹${payment.amount} has been refunded for your booking. It will reflect in 5–7 business days.`,
      type: 'refund_completed',
      data: { paymentId: payment._id, refundAmount: payment.amount },
      channel: 'in-app',
    });
  } catch (err) {
    logger.error('Refund notification failed (refund still applied):', err.message);
  }

  return payment;
};

// Refunds every captured deposit on a booking. Returns the refunded payments (empty if nothing was paid).
// Throws if any refund fails, so the caller can stop before it changes the booking.
const refundBookingDeposit = async (bookingId, reason) => {
  const payments = await Payment.find({ booking: bookingId, type: 'deposit', status: 'completed' });
  const refunded = [];
  for (const payment of payments) {
    refunded.push(await refundCapturedPayment(payment, reason));
  }
  return refunded;
};

module.exports = { refundCapturedPayment, refundBookingDeposit };
