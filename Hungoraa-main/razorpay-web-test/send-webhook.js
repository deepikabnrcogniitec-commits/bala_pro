// Sends a Razorpay-style webhook to your local backend, signed with RAZORPAY_WEBHOOK_SECRET from backend\.env.
// Usage (from the razorpay-web-test folder):
//   node send-webhook.js <order_id> [payment_id] [payment.captured | payment.failed]
// Use only for local testing; real events come from Razorpay (see the dashboard webhook settings).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '..', 'backend', '.env');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#') || !t.includes('=')) continue;
  const i = t.indexOf('=');
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const [orderId, paymentId = `pay_test_${Date.now()}`, event = 'payment.captured'] = process.argv.slice(2);
if (!orderId || !env.RAZORPAY_WEBHOOK_SECRET) {
  console.log('Usage: node send-webhook.js <order_id> [payment_id] [payment.captured|payment.failed]');
  console.log('Needs RAZORPAY_WEBHOOK_SECRET in backend\\.env');
  process.exit(1);
}

const body = JSON.stringify({
  event,
  payload: {
    payment: {
      entity: {
        id: paymentId,
        order_id: orderId,
        error_description: event === 'payment.failed' ? 'Simulated failure (local test)' : undefined,
      },
    },
  },
});
const signature = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');

fetch('http://localhost:5000/api/payments/webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signature },
  body,
})
  .then(async (r) => console.log(`HTTP ${r.status}`, await r.text()))
  .catch((e) => console.log('Request failed:', e.message));
