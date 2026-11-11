// MongoDB verification for the Razorpay test run. Read-only: it prints PASS/FAIL, never secrets.
// CMD usage (from the razorpay-web-test folder):
//   set ORDER_ID=order_xxxxxxxx
//   set BOOKING_ID=xxxxxxxxxxxxxxxxxxxxxxxx
//   set NEG_ORDER_ID=order_yyyyyyyy        (optional: order used for the fake-signature test)
//   mongosh "mongodb://localhost:27017/dinesmart" --file db-check.js

const orderId = process.env.ORDER_ID;
const bookingId = process.env.BOOKING_ID;
const negOrderId = process.env.NEG_ORDER_ID;
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });

if (!orderId || !bookingId) {
  print('Set ORDER_ID and BOOKING_ID first (see the usage at the top of this file).');
  quit(1);
}

const payment = db.payments.findOne({ razorpayOrderId: orderId });
const booking = ObjectId.isValid(bookingId) ? db.bookings.findOne({ _id: ObjectId(bookingId) }) : null;

check('payment record exists for ORDER_ID', payment, orderId);
check('booking exists for BOOKING_ID', booking, bookingId);

if (payment) {
  check('payment.status = completed', payment.status === 'completed', `status=${payment.status}`);
  check('payment.razorpayPaymentId stored', payment.razorpayPaymentId, payment.razorpayPaymentId || 'missing');
  check('payment.razorpaySignature stored', payment.razorpaySignature, payment.razorpaySignature ? 'present (value hidden)' : 'missing');
  check('payment.paidAt set', payment.paidAt, payment.paidAt ? String(payment.paidAt) : 'missing');
  check('payment.method = razorpay', payment.method === 'razorpay', `method=${payment.method}`);
  check('payment.type = deposit', payment.type === 'deposit', `type=${payment.type}`);
}

if (booking && payment) {
  check('booking.payment points to this payment', String(booking.payment) === String(payment._id),
    `booking.payment=${booking.payment}`);
  check('payment.booking points to this booking', String(payment.booking) === String(booking._id));
  check('payment.customer = booking.customer', String(payment.customer) === String(booking.customer));
  check('payment.restaurant = booking.restaurant', String(payment.restaurant) === String(booking.restaurant));
  const restaurant = db.restaurants.findOne({ _id: booking.restaurant }, { name: 1, status: 1 });
  check('booking restaurant exists and is approved/active',
    restaurant && ['approved', 'active'].includes(restaurant.status),
    restaurant ? `${restaurant.name} (${restaurant.status})` : 'missing');
  check('booking.isPaid = true', booking.isPaid === true, `isPaid=${booking.isPaid}`);
  check('booking.status = pending (held -> pending after deposit)', booking.status === 'pending', `status=${booking.status}`);
  check('booking.holdStatus = confirmed', booking.holdStatus === 'confirmed', `holdStatus=${booking.holdStatus}`);
  check('booking statusHistory has "Deposit paid"',
    (booking.statusHistory || []).some((h) => h.reason === 'Deposit paid'));
  check('payment.amount equals booking.depositAmount (info: backend does not enforce this)',
    payment.amount === booking.depositAmount, `payment=${payment.amount} deposit=${booking.depositAmount}`);
}

if (negOrderId) {
  const neg = db.payments.findOne({ razorpayOrderId: negOrderId });
  check('negative test: payment for NEG_ORDER_ID exists', neg, negOrderId);
  if (neg) {
    check('negative test: payment.status = failed', neg.status === 'failed', `status=${neg.status}`);
    check('negative test: failureReason = Signature mismatch', neg.failureReason === 'Signature mismatch',
      `failureReason=${neg.failureReason}`);
    check('negative test: no booking linked to failed payment', !db.bookings.findOne({ payment: neg._id }));
    check('negative test: no razorpayPaymentId was stored', !neg.razorpayPaymentId, neg.razorpayPaymentId || 'none');
  }
}

print('\n=== MongoDB checks ===');
results.forEach((r) => print(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  [' + r.detail + ']' : ''}`));
print(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
