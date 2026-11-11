const crypto = require('crypto');

// Constant-time comparison of two hex strings, so the signature cannot be guessed through timing.
const safeEqualHex = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
};

// Checkout signature: HMAC_SHA256(order_id|payment_id) using RAZORPAY_KEY_SECRET.
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error('RAZORPAY_KEY_SECRET is not configured');
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
};

// Webhook signature: HMAC_SHA256(raw request body) using RAZORPAY_WEBHOOK_SECRET.
const verifyWebhookSignature = (rawBody, signature, secret) => {
  if (!Buffer.isBuffer(rawBody) || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
};

module.exports = { safeEqualHex, verifyPaymentSignature, verifyWebhookSignature };
