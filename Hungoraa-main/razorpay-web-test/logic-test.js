const path = require('path');
const crypto = require('crypto');
const assert = require('assert');
const ROOT = path.resolve(process.argv[2]);
process.env.RAZORPAY_KEY_SECRET = 'test_key_secret_for_local_checks';
process.env.RAZORPAY_KEY_ID = 'rzp_test_local_fake_key';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret_for_local_checks';
const logger = require(path.join(ROOT, 'src/utils/logger'));
logger.error = () => {}; logger.warn = () => {}; logger.info = () => {};

// ── Fake Razorpay SDK (no network) ──
let orderSeq = 0;
class FakeRazorpay { constructor(){ this.orders = { create: async (o) => ({ id: 'order_' + (++orderSeq), amount: o.amount, currency: o.currency, receipt: o.receipt }) }; } }
const rpPath = require.resolve('razorpay', { paths: [ROOT] });
require.cache[rpPath] = { id: rpPath, filename: rpPath, loaded: true, exports: FakeRazorpay };

const Payment = require(path.join(ROOT, 'src/models/Payment'));
const Wallet = require(path.join(ROOT, 'src/models/Wallet'));
const Notification = require(path.join(ROOT, 'src/models/Notification'));
const BillPayment = require(path.join(ROOT, 'src/models/BillPayment'));
const Invoice = require(path.join(ROOT, 'src/models/Invoice'));
const Restaurant = require(path.join(ROOT, 'src/models/Restaurant'));
const Booking = require(path.join(ROOT, 'src/models/Booking'));
const User = require(path.join(ROOT, 'src/models/User'));
const pc = require(path.join(ROOT, 'src/controllers/payment.controller'));
const bc = require(path.join(ROOT, 'src/controllers/billPayment.controller'));
const loyalty = require(path.join(ROOT, 'src/services/loyalty.service'));
const email = require(path.join(ROOT, 'src/services/email.service'));
const commission = require(path.join(ROOT, 'src/services/commission.service'));

// ── In-memory store + minimal query matcher ──
let db;
const matches = (doc, filter) => Object.entries(filter).every(([k, v]) => {
  const dv = doc[k];
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    if ('$ne' in v) return String(dv) !== String(v.$ne);
    if ('$in' in v) return v.$in.map(String).includes(String(dv));
  }
  return String(dv) === String(v);
});
const findOne = (arr, f) => arr.find((d) => matches(d, f)) || null;
const withSave = (o) => Object.assign(o, { save: async () => o, populate: async () => o });

function fresh() {
  db = {
    payments: [], wallets: [], notifications: [], bills: [], invoices: [], bookings: [], restaurants: [], users: [],
    emails: 0, cashbacks: 0,
  };
  db.restaurants.push(withSave({ _id: 'r1', owner: 'o1', name: 'Test Kitchen', commission: 10, bookingSettings: { depositAmount: 500 } }));
  db.users.push(withSave({ _id: 'u1', email: 'c1@x.in', name: 'Cust 1', role: 'customer' }));
  db.users.push(withSave({ _id: 'u2', email: 'c2@x.in', name: 'Cust 2', role: 'customer' }));
  db.wallets.push(withSave({ _id: 'w1', user: 'u1', balance: 0, transactions: [],
    credit(amount, desc, refId, type) { this.balance += amount; this.transactions.push({ type: 'credit', amount, refId, type }); return Promise.resolve(this); } }));
  db.wallets.push(withSave({ _id: 'w2', user: 'u2', balance: 0, transactions: [],
    credit(amount, desc, refId, type) { this.balance += amount; this.transactions.push({ type: 'credit', amount, refId, type }); return Promise.resolve(this); } }));
  db.bookings.push(withSave({ _id: 'b1', bookingId: 'DS1', customer: 'u1', restaurant: db.restaurants[0], status: 'held',
    isPaid: false, holdStatus: 'held', depositAmount: 0, statusHistory: [] }));
  orderSeq = 0;
}

// ── Model stubs ──
Payment.findOne = async (f) => findOne(db.payments, f);
Payment.findById = async (id) => findOne(db.payments, { _id: id });
Payment.create = async (d) => { const p = withSave({ _id: 'p' + (db.payments.length + 1), ...d }); db.payments.push(p); return p; };
Payment.findOneAndUpdate = async (f, upd) => { const p = findOne(db.payments, f); if (!p) return null; Object.assign(p, upd); return p; };
Payment.updateOne = async (f, upd) => { const p = findOne(db.payments, f); if (p) Object.assign(p, upd); return { modifiedCount: p ? 1 : 0 }; };
Booking.findById = (id) => ({ populate: async () => findOne(db.bookings, { _id: id }) });
Booking.findOneAndUpdate = async (f, upd) => { const b = findOne(db.bookings, f); if (!b) return null; Object.assign(b, upd); return b; };
Wallet.findOne = async (f) => findOne(db.wallets, f);
Notification.create = async (d) => { db.notifications.push(d); return d; };
User.findById = async (id) => findOne(db.users, { _id: id });
Restaurant.findById = (id) => ({ populate: async () => findOne(db.restaurants, { _id: id }) });
BillPayment.findOne = async (f) => findOne(db.bills, f);
BillPayment.findOneAndUpdate = async (f, upd) => { const b = findOne(db.bills, f); if (!b) return null; Object.assign(b, upd); return b; };
Invoice.create = async (d) => { const inv = withSave({ _id: 'inv' + (db.invoices.length + 1), ...d }); db.invoices.push(inv); return inv; };
commission.createFromInvoice = async () => ({});
loyalty.awardBillPaymentCashback = async () => { db.cashbacks++; return { coins: 5, walletBalance: 0 }; };
email.sendBillPaymentEmails = async () => { db.emails++; };
const Offer = require(path.join(ROOT, 'src/models/Offer'));
Offer.findById = async () => null;

// ── Helpers ──
const sign = (orderId, paymentId) => crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
const hookSign = (raw) => crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex');
const res = () => ({ code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });
const call = async (fn, req) => { const r = res(); await fn(req, r); return r; };
const verify = (user, orderId, paymentId, bookingId = 'b1') => call(pc.verifyPayment, { user: { _id: user }, body: { razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: sign(orderId, paymentId), bookingId } });
const hook = (event, entity) => {
  const raw = Buffer.from(JSON.stringify({ event, payload: { payment: { entity } } }));
  return call(pc.razorpayWebhook, { body: raw, headers: { 'x-razorpay-signature': hookSign(raw) } });
};
const createOrder = (user, amount, bookingId = 'b1') => call(pc.createOrder, { user: { _id: user }, body: { bookingId, amount, type: 'deposit' } });

const results = [];
async function test(name, fn) {
  fresh();
  try { await fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name, e.message]); }
}

(async () => {
  await test('C1 createOrder rejects amount that differs from deposit', async () => {
    const r = await createOrder('u1', 300);
    assert.strictEqual(r.code, 400); assert.match(r.body.message, /must equal the booking deposit/);
  });
  await test('C2 createOrder rejects a different customer', async () => {
    const r = await createOrder('u2', 500); assert.strictEqual(r.code, 403);
  });
  await test('C3 createOrder succeeds for owner with exact deposit and returns paise + key', async () => {
    const r = await createOrder('u1', 500);
    assert.strictEqual(r.code, 200);
    assert.strictEqual(r.body.data.amount, 50000); assert.strictEqual(r.body.data.currency, 'INR');
    assert.strictEqual(db.payments.length, 1); assert.strictEqual(db.payments[0].status, 'pending');
  });
  await test('V1 verify with bad signature -> 400 and pending payment marked failed', async () => {
    await createOrder('u1', 500);
    const r = await call(pc.verifyPayment, { user: { _id: 'u1' }, body: { razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_1', razorpaySignature: '0'.repeat(64), bookingId: 'b1' } });
    assert.strictEqual(r.code, 400); assert.strictEqual(db.payments[0].status, 'failed');
    assert.strictEqual(db.bookings[0].isPaid, false);
  });
  await test('V2 verify by a different customer -> 404 (ownership)', async () => {
    await createOrder('u1', 500);
    const r = await verify('u2', 'order_1', 'pay_1'); assert.strictEqual(r.code, 404);
    assert.strictEqual(db.payments[0].status, 'pending');
  });
  await test('V3 verify with a bookingId that is not this payment\'s booking -> 400', async () => {
    await createOrder('u1', 500);
    const r = await verify('u1', 'order_1', 'pay_1', 'bX'); assert.strictEqual(r.code, 400);
    assert.strictEqual(db.payments[0].status, 'pending');
  });
  await test('V4 valid verify completes payment and confirms booking', async () => {
    await createOrder('u1', 500);
    const r = await verify('u1', 'order_1', 'pay_1'); assert.strictEqual(r.code, 200); assert.strictEqual(r.body.message, 'Payment verified');
    const p = db.payments[0], b = db.bookings[0];
    assert.strictEqual(p.status, 'completed'); assert.strictEqual(p.razorpayPaymentId, 'pay_1'); assert.ok(p.paidAt);
    assert.strictEqual(b.isPaid, true); assert.strictEqual(String(b.payment), String(p._id));
    assert.strictEqual(b.status, 'pending'); assert.strictEqual(b.holdStatus, 'confirmed');
    assert.strictEqual(db.notifications.length, 1);
    assert.strictEqual(String(b.restaurant._id), 'r1');
  });
  await test('V5 repeated valid verify is idempotent (no second notification or status change)', async () => {
    await createOrder('u1', 500);
    await verify('u1', 'order_1', 'pay_1');
    const h = db.bookings[0].statusHistory.length;
    const r = await verify('u1', 'order_1', 'pay_1');
    assert.strictEqual(r.code, 200); assert.strictEqual(r.body.message, 'Payment already verified');
    assert.strictEqual(db.notifications.length, 1); assert.strictEqual(db.bookings[0].statusHistory.length, h);
  });
  await test('V6 bad signature after completion does NOT overwrite the completed payment', async () => {
    await createOrder('u1', 500);
    await verify('u1', 'order_1', 'pay_1');
    const r = await call(pc.verifyPayment, { user: { _id: 'u1' }, body: { razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_x', razorpaySignature: '1'.repeat(64), bookingId: 'b1' } });
    assert.strictEqual(r.code, 400);
    assert.strictEqual(db.payments[0].status, 'completed'); assert.strictEqual(db.payments[0].razorpayPaymentId, 'pay_1');
    assert.strictEqual(db.bookings[0].isPaid, true);
  });
  await test('W1 webhook with bad signature -> 400, no change', async () => {
    await createOrder('u1', 500);
    const raw = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } } }));
    const r = await call(pc.razorpayWebhook, { body: raw, headers: { 'x-razorpay-signature': 'f'.repeat(64) } });
    assert.strictEqual(r.code, 400); assert.strictEqual(db.payments[0].status, 'pending');
  });
  await test('W2 webhook payment.captured alone confirms the booking (app verify never arrived)', async () => {
    await createOrder('u1', 500);
    const r = await hook('payment.captured', { id: 'pay_1', order_id: 'order_1' });
    assert.strictEqual(r.code, 200); assert.deepStrictEqual(r.body, { status: 'ok' });
    assert.strictEqual(db.payments[0].status, 'completed'); assert.strictEqual(db.bookings[0].isPaid, true);
    assert.strictEqual(db.bookings[0].status, 'pending');
    // later app verify is harmless
    const v = await verify('u1', 'order_1', 'pay_1'); assert.strictEqual(v.code, 200);
    assert.strictEqual(db.notifications.length, 1);
  });
  await test('W3 duplicate payment.captured webhooks do not duplicate notifications or history', async () => {
    await createOrder('u1', 500);
    await hook('payment.captured', { id: 'pay_1', order_id: 'order_1' });
    await hook('payment.captured', { id: 'pay_1', order_id: 'order_1' });
    assert.strictEqual(db.notifications.length, 1);
    assert.strictEqual(db.bookings[0].statusHistory.filter((h) => h.reason === 'Deposit paid (webhook)').length, 1);
  });
  await test('W4 failed attempt then successful retry on same order -> hold revived and booking confirmed', async () => {
    await createOrder('u1', 500);
    await hook('payment.failed', { id: 'pay_f', order_id: 'order_1', error_description: 'Card declined' });
    assert.strictEqual(db.payments[0].status, 'failed'); assert.strictEqual(db.bookings[0].status, 'cancelled');
    await hook('payment.captured', { id: 'pay_2', order_id: 'order_1' });
    assert.strictEqual(db.payments[0].status, 'completed'); assert.strictEqual(db.bookings[0].status, 'pending');
    assert.strictEqual(db.bookings[0].isPaid, true); assert.strictEqual(db.bookings[0].cancellationReason, undefined);
  });
  await test('W5 payment.failed never overwrites a completed payment', async () => {
    await createOrder('u1', 500);
    await verify('u1', 'order_1', 'pay_1');
    await hook('payment.failed', { id: 'pay_9', order_id: 'order_1', error_description: 'x' });
    assert.strictEqual(db.payments[0].status, 'completed'); assert.strictEqual(db.bookings[0].isPaid, true);
  });
  await test('T1 wallet top-up: verify then duplicate webhook credits exactly once', async () => {
    db.payments.push(withSave({ _id: 'tp1', razorpayOrderId: 'order_T', customer: 'u1', type: 'wallet_topup', amount: 200, status: 'pending' }));
    const v = await call(pc.topUpWallet, { user: { _id: 'u1' }, body: { razorpayOrderId: 'order_T', razorpayPaymentId: 'pay_T', razorpaySignature: sign('order_T', 'pay_T') } });
    assert.strictEqual(v.code, 200); assert.strictEqual(db.wallets[0].balance, 200);
    await hook('payment.captured', { id: 'pay_T', order_id: 'order_T' });
    assert.strictEqual(db.wallets[0].balance, 200, 'webhook double-credited the wallet');
    const again = await call(pc.topUpWallet, { user: { _id: 'u1' }, body: { razorpayOrderId: 'order_T', razorpayPaymentId: 'pay_T', razorpaySignature: sign('order_T', 'pay_T') } });
    assert.strictEqual(again.code, 200); assert.strictEqual(db.wallets[0].balance, 200);
  });
  await test('T2 wallet top-up: webhook first then verify credits exactly once', async () => {
    db.payments.push(withSave({ _id: 'tp1', razorpayOrderId: 'order_T', customer: 'u1', type: 'wallet_topup', amount: 150, status: 'pending' }));
    await hook('payment.captured', { id: 'pay_T', order_id: 'order_T' });
    assert.strictEqual(db.wallets[0].balance, 150);
    await call(pc.topUpWallet, { user: { _id: 'u1' }, body: { razorpayOrderId: 'order_T', razorpayPaymentId: 'pay_T', razorpaySignature: sign('order_T', 'pay_T') } });
    assert.strictEqual(db.wallets[0].balance, 150, 'verify double-credited after webhook');
  });
  await test('T3 wallet top-up by another customer -> 404', async () => {
    db.payments.push(withSave({ _id: 'tp1', razorpayOrderId: 'order_T', customer: 'u1', type: 'wallet_topup', amount: 150, status: 'pending' }));
    const r = await call(pc.topUpWallet, { user: { _id: 'u2' }, body: { razorpayOrderId: 'order_T', razorpayPaymentId: 'pay_T', razorpaySignature: sign('order_T', 'pay_T') } });
    assert.strictEqual(r.code, 404); assert.strictEqual(db.wallets[0].balance, 0);
  });
  const billFixture = () => db.bills.push(withSave({ _id: 'bp1', razorpayOrderId: 'order_BP', customer: 'u1', restaurant: 'r1',
    billAmount: 1000, finalAmount: 1000, tipAmount: 0, convenienceFee: 0, gstAmount: 0, paymentMethod: 'razorpay',
    paymentStatus: 'pending', billStatus: 'preview', discountBreakup: {}, commissionPercentage: 10 }));
  await test('B1 bill: complete with valid signature marks paid once, invoice + cashback', async () => {
    billFixture();
    const r = await call(bc.completeBillPayment, { user: { _id: 'u1', email: 'c1@x.in' }, body: { razorpayOrderId: 'order_BP', razorpayPaymentId: 'pay_BP', razorpaySignature: sign('order_BP', 'pay_BP') } });
    assert.strictEqual(r.code, 200, JSON.stringify(r.body));
    assert.strictEqual(db.bills[0].paymentStatus, 'paid'); assert.strictEqual(db.invoices.length, 1); assert.strictEqual(db.cashbacks, 1);
  });
  await test('B2 bill: duplicate complete -> 400, no second invoice/cashback', async () => {
    billFixture();
    const body = { razorpayOrderId: 'order_BP', razorpayPaymentId: 'pay_BP', razorpaySignature: sign('order_BP', 'pay_BP') };
    await call(bc.completeBillPayment, { user: { _id: 'u1', email: 'c1@x.in' }, body });
    const r = await call(bc.completeBillPayment, { user: { _id: 'u1', email: 'c1@x.in' }, body });
    assert.strictEqual(r.code, 400); assert.strictEqual(db.invoices.length, 1); assert.strictEqual(db.cashbacks, 1);
  });
  await test('B3 bill: webhook captured completes the bill, later complete and webhook do not duplicate', async () => {
    billFixture();
    await hook('payment.captured', { id: 'pay_BP', order_id: 'order_BP' });
    assert.strictEqual(db.bills[0].paymentStatus, 'paid'); assert.strictEqual(db.cashbacks, 1);
    await hook('payment.captured', { id: 'pay_BP', order_id: 'order_BP' });
    const r = await call(bc.completeBillPayment, { user: { _id: 'u1', email: 'c1@x.in' }, body: { razorpayOrderId: 'order_BP', razorpayPaymentId: 'pay_BP', razorpaySignature: sign('order_BP', 'pay_BP') } });
    assert.strictEqual(r.code, 400);
    assert.strictEqual(db.invoices.length, 1); assert.strictEqual(db.cashbacks, 1); assert.strictEqual(db.emails, 1);
  });
  await test('B4 bill: complete by another customer -> 404', async () => {
    billFixture();
    const r = await call(bc.completeBillPayment, { user: { _id: 'u2', email: 'c2@x.in' }, body: { razorpayOrderId: 'order_BP', razorpayPaymentId: 'pay_BP', razorpaySignature: sign('order_BP', 'pay_BP') } });
    assert.strictEqual(r.code, 404); assert.strictEqual(db.bills[0].paymentStatus, 'pending');
  });
  await test('B5 bill: bad signature -> 400', async () => {
    billFixture();
    const r = await call(bc.completeBillPayment, { user: { _id: 'u1', email: 'c1@x.in' }, body: { razorpayOrderId: 'order_BP', razorpayPaymentId: 'pay_BP', razorpaySignature: 'a'.repeat(64) } });
    assert.strictEqual(r.code, 400); assert.strictEqual(db.bills[0].paymentStatus, 'pending');
  });
  await test('X1 webhook with missing secret config -> 500 (fails closed)', async () => {
    const saved = process.env.RAZORPAY_WEBHOOK_SECRET; delete process.env.RAZORPAY_WEBHOOK_SECRET;
    try { const raw = Buffer.from('{}'); const r = await call(pc.razorpayWebhook, { body: raw, headers: {} }); assert.strictEqual(r.code, 500); }
    finally { process.env.RAZORPAY_WEBHOOK_SECRET = saved; }
  });
  await test('X2 webhook with parsed (non-Buffer) body -> 400 (guards the raw-body regression)', async () => {
    const r = await call(pc.razorpayWebhook, { body: { event: 'payment.captured' }, headers: { 'x-razorpay-signature': 'x' } });
    assert.strictEqual(r.code, 400);
  });

  const failed = results.filter((r) => r[0] === 'FAIL');
  for (const r of results) console.log(r[0], r[1], r[2] ? '\n     -> ' + r[2] : '');
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})();
