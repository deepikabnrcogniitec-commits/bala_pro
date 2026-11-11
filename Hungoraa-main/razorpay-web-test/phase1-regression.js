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
let refundCalls = [];
let refundShouldFail = false;
class FakeRazorpay { constructor(){
  this.orders = { create: async (o) => ({ id: 'order_' + (++orderSeq), amount: o.amount, currency: o.currency, receipt: o.receipt }) };
  this.payments = { refund: async (pid, opts) => {
    if (refundShouldFail) throw new Error('Razorpay refund unavailable');
    refundCalls.push({ pid, amount: opts.amount });
    return { id: 'rfnd_' + refundCalls.length, amount: opts.amount };
  } };
} }
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
  if (k === '$or') return v.some((sub) => matches(doc, sub));
  const dv = doc[k];
  if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
    if ('$ne' in v) return String(dv) !== String(v.$ne);
    if ('$in' in v) return v.$in.map(String).includes(String(dv));
    if ('$gt' in v) return dv instanceof Date && dv > v.$gt;
    if ('$lte' in v) return dv instanceof Date && dv <= v.$lte;
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
  db.restaurants.push(withSave({ _id: 'r1', slug: 'r1', owner: 'o1', name: 'Test Kitchen', commission: 10, status: 'approved', isActive: true, bookingSettings: { depositRequired: true, depositAmount: 500 } }));
  db.users.push(withSave({ _id: 'u1', email: 'c1@x.in', name: 'Cust 1', role: 'customer' }));
  db.users.push(withSave({ _id: 'u2', email: 'c2@x.in', name: 'Cust 2', role: 'customer' }));
  db.wallets.push(withSave({ _id: 'w1', user: 'u1', balance: 0, transactions: [],
    credit(amount, desc, refId, type) { this.balance += amount; this.transactions.push({ type: 'credit', amount, refId, type }); return Promise.resolve(this); } }));
  db.wallets.push(withSave({ _id: 'w2', user: 'u2', balance: 0, transactions: [],
    credit(amount, desc, refId, type) { this.balance += amount; this.transactions.push({ type: 'credit', amount, refId, type }); return Promise.resolve(this); } }));
  db.bookings.push(withSave({ _id: 'b1', bookingId: 'DS1', customer: 'u1', restaurant: db.restaurants[0], status: 'held',
    isPaid: false, holdStatus: 'held', depositAmount: 0, holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000), statusHistory: [] }));
  orderSeq = 0; refundCalls = []; refundShouldFail = false;
}

// ── Model stubs ──
Payment.findOne = async (f) => findOne(db.payments, f);
Payment.findById = async (id) => findOne(db.payments, { _id: id });
Payment.create = async (d) => { const p = withSave({ _id: 'p' + (db.payments.length + 1), ...d }); db.payments.push(p); return p; };
Payment.findOneAndUpdate = async (f, upd) => { const p = findOne(db.payments, f); if (!p) return null; Object.assign(p, upd); return p; };
Payment.updateOne = async (f, upd) => { const p = findOne(db.payments, f); if (p) Object.assign(p, upd); return { modifiedCount: p ? 1 : 0 }; };
Booking.findById = (id) => ({ populate: async () => findOne(db.bookings, { _id: id }) });
Booking.findOne = async (f) => findOne(db.bookings, f);
Booking.exists = async (f) => (db.bookings.some((b) => matches(b, f)) ? { _id: 'x' } : null);
Booking.create = async (d) => { const b = withSave({ _id: 'b' + (db.bookings.length + 1), bookingId: 'DSN' + db.bookings.length, statusHistory: [], ...d }); db.bookings.push(b); return b; };
Booking.updateOne = async (f, upd) => {
  const b = findOne(db.bookings, f); if (!b) return { modifiedCount: 0 };
  Object.assign(b, upd.$set || {});
  for (const [key, val] of Object.entries(upd.$push || {})) (b[key] = b[key] || []).push(val);
  return { modifiedCount: 1 };
};
Booking.find = (f) => {
  const rows = () => db.bookings.filter((b) => matches(b, f));
  return { select: () => ({ lean: async () => rows().map((b) => ({ _id: b._id })) }), distinct: async (field) => rows().map((b) => b[field]) };
};
Payment.find = async (f) => db.payments.filter((p) => matches(p, f));
Restaurant.findOne = (f) => {
  const p = Promise.resolve(findOne(db.restaurants, f));
  p.populate = () => p; // mirrors Mongoose Query.populate(), which createBillPayment chains
  return p;
};
const Table = require(path.join(ROOT, 'src/models/Table'));
Table.findById = async (id) => (id ? { _id: id, isActive: true, capacity: 10 } : null);
const billingService = require(path.join(ROOT, 'src/services/billing.service'));
billingService.getSettings = async () => ({ enableRazorpay: true });
billingService.withAppDiscount = async (amount, breakup) => ({ discountBreakup: breakup, appDiscount: 0, appDiscountLabel: '' });
billingService.computeCharges = async (base, tip) => ({ convenienceFee: 0, gstAmount: 0, toPay: base + tip });
const bc2 = bc;
const bookingCtl = require(path.join(ROOT, 'src/controllers/booking.controller'));
const holdRelease = require(path.join(ROOT, 'src/services/holdRelease.service'));
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
const hookRefund = (entity) => {
  const raw = Buffer.from(JSON.stringify({ event: 'refund.processed', payload: { refund: { entity } } }));
  return call(pc.razorpayWebhook, { body: raw, headers: { 'x-razorpay-signature': hookSign(raw) } });
};
const callNext = async (fn, req) => { const r = res(); await fn(req, r, (e) => { r.code = 500; r.body = { message: e.message }; }); return r; };
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


  // ── Phase 1: hold expiry, deposit hold, cancellation and refund ──
  const expireHold = (id = 'b1') => { db.bookings.find((b) => String(b._id) === id).holdExpiresAt = new Date(Date.now() - 1000); };
  const cust = (id) => ({ user: { _id: id } });

  await test('H1 holdBooking refuses a restaurant that takes no deposit (no booking created)', async () => {
    db.restaurants[0].bookingSettings = { depositRequired: false, depositAmount: 500 };
    const before = db.bookings.length;
    const r = await callNext(bookingCtl.holdBooking, { ...cust('u1'), body: { restaurantId: 'r1', date: '2026-12-01', time: '7:30 PM', guests: 2, paymentMethod: 'razorpay' } });
    assert.strictEqual(r.code, 400); assert.strictEqual(db.bookings.length, before);
  });
  await test('H2 holdBooking creates a 5-minute hold with the restaurant deposit (client amount ignored)', async () => {
    const before = Date.now();
    const r = await callNext(bookingCtl.holdBooking, { ...cust('u2'), body: { restaurantId: 'r1', date: '2026-12-01', time: '8:00 PM', guests: 2, paymentMethod: 'razorpay', depositAmount: 1 } });
    assert.strictEqual(r.code, 201, JSON.stringify(r.body));
    const b = r.body.data.booking;
    assert.strictEqual(b.status, 'held'); assert.strictEqual(b.holdStatus, 'held'); assert.strictEqual(b.depositAmount, 500);
    const ms = new Date(b.holdExpiresAt).getTime() - before;
    assert.ok(ms > 4.9 * 60000 && ms < 5.1 * 60000, 'hold window is not 5 minutes: ' + ms);
    assert.strictEqual(r.body.data.depositAmount, 500);
  });
  await test('H3 an active hold blocks the table for another customer; an expired hold does not', async () => {
    db.bookings.push(withSave({ _id: 'bt', bookingId: 'DST', customer: 'u1', restaurant: 'r1', table: 't1', date: '2026-12-02', time: '9:00 PM',
      status: 'held', holdStatus: 'held', holdExpiresAt: new Date(Date.now() + 60000), isPaid: false, statusHistory: [] }));
    const blocked = await callNext(bookingCtl.holdBooking, { ...cust('u2'), body: { restaurantId: 'r1', tableId: 't1', date: '2026-12-02', time: '9:00 PM', guests: 2, paymentMethod: 'razorpay' } });
    assert.strictEqual(blocked.code, 409);
    db.bookings.find((b) => b._id === 'bt').holdExpiresAt = new Date(Date.now() - 1000);
    const free = await callNext(bookingCtl.holdBooking, { ...cust('u2'), body: { restaurantId: 'r1', tableId: 't1', date: '2026-12-02', time: '9:00 PM', guests: 2, paymentMethod: 'razorpay' } });
    assert.strictEqual(free.code, 201, JSON.stringify(free.body));
  });
  await test('H4 createOrder refuses an expired hold and creates no Razorpay order or payment', async () => {
    expireHold('b1');
    const r = await createOrder('u1', 500);
    assert.strictEqual(r.code, 400); assert.match(r.body.message, /hold has expired/);
    assert.strictEqual(db.payments.length, 0);
  });
  await test('H5 createOrder still works while the hold is active', async () => {
    const r = await createOrder('u1', 500); assert.strictEqual(r.code, 200);
  });
  await test('H6 wallet deposit refuses an expired hold and debits nothing', async () => {
    db.wallets[0].balance = 1000;
    db.wallets[0].debit = async function (amount) { this.balance -= amount; return this; };
    expireHold('b1');
    const r = await call(pc.payWithWallet, { user: { _id: 'u1' }, body: { bookingId: 'b1', amount: 500 } });
    assert.strictEqual(r.code, 400); assert.strictEqual(db.wallets[0].balance, 1000); assert.strictEqual(db.payments.length, 0);
  });
  await test('H7 expired-hold sweep releases only unpaid expired holds; paid bookings are untouched', async () => {
    db.bookings.push(withSave({ _id: 'bp', bookingId: 'DSP', customer: 'u1', restaurant: 'r1', status: 'pending', isPaid: true,
      holdStatus: 'confirmed', holdExpiresAt: new Date(Date.now() - 60000), statusHistory: [] }));
    expireHold('b1');
    const n = await holdRelease.releaseExpiredHolds();
    const b1 = db.bookings.find((b) => b._id === 'b1'), bp = db.bookings.find((b) => b._id === 'bp');
    assert.strictEqual(n, 1);
    assert.strictEqual(b1.status, 'cancelled'); assert.strictEqual(b1.holdStatus, 'released'); assert.strictEqual(b1.cancellationReason, 'Hold expired');
    assert.match(b1.statusHistory[b1.statusHistory.length - 1].reason, /Hold expired/);
    assert.strictEqual(bp.status, 'pending'); assert.strictEqual(bp.isPaid, true);
  });
  await test('H8 an active hold is not released by the sweep', async () => {
    const n = await holdRelease.releaseExpiredHolds();
    assert.strictEqual(n, 0); assert.strictEqual(db.bookings.find((b) => b._id === 'b1').status, 'held');
  });
  await test('H9 money captured after the hold expired is refunded automatically (no booking confirmed)', async () => {
    await createOrder('u1', 500);
    expireHold('b1'); await holdRelease.releaseExpiredHolds();
    const r = await verify('u1', 'order_1', 'pay_1');
    assert.strictEqual(r.code, 409); assert.match(r.body.message, /refunded/);
    assert.strictEqual(refundCalls.length, 1); assert.strictEqual(refundCalls[0].pid, 'pay_1'); assert.strictEqual(refundCalls[0].amount, 50000);
    assert.strictEqual(db.payments[0].status, 'refunded'); assert.strictEqual(db.bookings[0].status, 'cancelled'); assert.strictEqual(db.bookings[0].isPaid, false);
  });
  await test('H10 webhook capture on a released booking is refunded and never confirms it', async () => {
    await createOrder('u1', 500);
    expireHold('b1'); await holdRelease.releaseExpiredHolds();
    await hook('payment.captured', { id: 'pay_W', order_id: 'order_1' });
    assert.strictEqual(refundCalls.length, 1); assert.strictEqual(db.payments[0].status, 'refunded'); assert.strictEqual(db.bookings[0].isPaid, false);
  });
  await test('H11 if the auto-refund call fails, the payment stays captured and is flagged (not silently dropped)', async () => {
    await createOrder('u1', 500);
    expireHold('b1'); await holdRelease.releaseExpiredHolds();
    refundShouldFail = true;
    const r = await verify('u1', 'order_1', 'pay_1');
    assert.strictEqual(r.code, 409); assert.match(r.body.message, /Support will refund/);
    assert.strictEqual(db.payments[0].status, 'completed'); assert.strictEqual(db.bookings[0].status, 'cancelled');
  });
  // paid-deposit fixture for cancellation tests
  const paidBooking = (method = 'razorpay') => {
    db.bookings[0].status = 'pending'; db.bookings[0].isPaid = true; db.bookings[0].holdStatus = 'confirmed';
    db.payments.push(withSave({ _id: 'p9', booking: 'b1', customer: 'u1', restaurant: 'r1', amount: 500, method, type: 'deposit',
      status: 'completed', razorpayPaymentId: method === 'razorpay' ? 'pay_9' : undefined, razorpayOrderId: 'order_9' }));
    db.bookings[0].payment = 'p9';
  };
  await test('H12 customer cancels a paid booking: Razorpay refund for the full deposit, then cancelled', async () => {
    paidBooking('razorpay');
    const r = await call(bookingCtl.cancelBooking, { ...cust('u1'), params: { id: 'b1' }, body: { reason: 'Plans changed' } });
    assert.strictEqual(r.code, 200, JSON.stringify(r.body));
    assert.strictEqual(refundCalls.length, 1); assert.strictEqual(refundCalls[0].amount, 50000);
    assert.strictEqual(db.payments[0].status, 'refunded'); assert.strictEqual(db.bookings[0].status, 'cancelled');
  });
  await test('H13 customer cancels a wallet-paid booking: credited back to wallet, no Razorpay call', async () => {
    paidBooking('wallet');
    const r = await call(bookingCtl.cancelBooking, { ...cust('u1'), params: { id: 'b1' }, body: { reason: 'x' } });
    assert.strictEqual(r.code, 200);
    assert.strictEqual(refundCalls.length, 0); assert.strictEqual(db.wallets[0].balance, 500);
    assert.strictEqual(db.payments[0].status, 'refunded'); assert.strictEqual(db.bookings[0].status, 'cancelled');
  });
  await test('H14 if the Razorpay refund fails, the booking is NOT cancelled and the payment stays completed', async () => {
    paidBooking('razorpay'); refundShouldFail = true;
    const r = await call(bookingCtl.cancelBooking, { ...cust('u1'), params: { id: 'b1' }, body: { reason: 'x' } });
    assert.strictEqual(r.code, 502);
    assert.strictEqual(db.bookings[0].status, 'pending'); assert.strictEqual(db.bookings[0].isPaid, true); assert.strictEqual(db.payments[0].status, 'completed');
  });
  await test('H15 cancelling an unpaid held booking needs no refund', async () => {
    const r = await call(bookingCtl.cancelBooking, { ...cust('u1'), params: { id: 'b1' }, body: { reason: 'x' } });
    assert.strictEqual(r.code, 200); assert.strictEqual(refundCalls.length, 0); assert.strictEqual(db.bookings[0].status, 'cancelled');
  });
  await test('H16 restaurant owner cancelling a paid booking triggers the deposit refund', async () => {
    paidBooking('razorpay');
    const r = await call(bookingCtl.updateBookingStatus, { user: { _id: 'o1', role: 'owner' }, params: { id: 'b1' }, body: { status: 'cancelled', reason: 'Restaurant closed' } });
    assert.strictEqual(r.code, 200, JSON.stringify(r.body));
    assert.strictEqual(refundCalls.length, 1); assert.strictEqual(db.payments[0].status, 'refunded');
  });
  await test('H17 partial refunds: remaining balance is tracked and over-refund is rejected', async () => {
    paidBooking('razorpay');
    const admin = (amount) => call(pc.refundPayment, { user: { _id: 'o1', role: 'admin' }, params: { id: 'p9' }, body: { amount, reason: 'x' } });
    let r = await admin(200); assert.strictEqual(r.code, 200, JSON.stringify(r.body));
    assert.strictEqual(db.payments[0].status, 'partially_refunded'); assert.strictEqual(db.payments[0].refundAmount, 200);
    r = await admin(400); assert.strictEqual(r.code, 400); assert.match(r.body.message, /at most ₹300/);
    r = await admin(300); assert.strictEqual(r.code, 200);
    assert.strictEqual(db.payments[0].status, 'refunded'); assert.strictEqual(db.payments[0].refundAmount, 500);
    r = await admin(1); assert.strictEqual(r.code, 400);
  });
  await test('H18 webhook refund.processed for a refund we already recorded does not double count', async () => {
    paidBooking('razorpay');
    await call(pc.refundPayment, { user: { _id: 'o1', role: 'admin' }, params: { id: 'p9' }, body: { amount: 200, reason: 'x' } });
    const rid = db.payments[0].refundId;
    const wh = await hookRefund({ id: rid, payment_id: 'pay_9', amount: 20000 });
    assert.strictEqual(wh.code, 200); assert.ok(rid, 'refund id was recorded by the API');
    assert.strictEqual(db.payments[0].refundAmount, 200);
  });
  await test('H19 webhook refund.processed for a refund made in the Razorpay dashboard is recorded once', async () => {
    paidBooking('razorpay');
    await hookRefund({ id: 'rfnd_dash', payment_id: 'pay_9', amount: 15000 });
    assert.strictEqual(db.payments[0].refundAmount, 150); assert.strictEqual(db.payments[0].status, 'partially_refunded');
    await hookRefund({ id: 'rfnd_dash', payment_id: 'pay_9', amount: 15000 });
    assert.strictEqual(db.payments[0].refundAmount, 150);
  });
  await test('H20 bill payment with no live Razorpay gateway is refused (503), never marked paid', async () => {
    const saved = process.env.RAZORPAY_KEY_ID; delete process.env.RAZORPAY_KEY_ID;
    try {
      billFixture();
      const r = await callNext(bc.createBillPayment, { user: { _id: 'u1', email: 'c1@x.in' }, body: { restaurantId: 'r1', billAmount: 1000, paymentMethod: 'razorpay' } });
      assert.strictEqual(r.code, 503, JSON.stringify(r.body));
      assert.strictEqual(db.invoices.length, 0); assert.strictEqual(db.cashbacks, 0);
      assert.notStrictEqual(db.bills[0].paymentStatus, 'paid');
    } finally { process.env.RAZORPAY_KEY_ID = saved; }
  });

  const failed = results.filter((r) => r[0] === 'FAIL');
  for (const r of results) console.log(r[0], r[1], r[2] ? '\n     -> ' + r[2] : '');
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})();
