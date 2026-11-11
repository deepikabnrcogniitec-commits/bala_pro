const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const BillPayment = require('../models/BillPayment');
const Invoice = require('../models/Invoice');
const Commission = require('../models/Commission');
const Restaurant = require('../models/Restaurant');
const Offer = require('../models/Offer');
const Wallet = require('../models/Wallet');
const Notification = require('../models/Notification');
const discountService = require('../services/discount.service');
const commissionService = require('../services/commission.service');
const billingService = require('../services/billing.service');
const loyaltyService = require('../services/loyalty.service');
const emailService = require('../services/email.service');
const { successResponse, errorResponse } = require('../utils/response');
const { verifyPaymentSignature } = require('../utils/razorpay');

const getRazorpay = () => new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// A restaurant you can pay a bill at: any active restaurant, looked up by
// ObjectId OR slug. `payBillEnabled` is no longer a hard gate — legacy docs were
// stored `false` by the old schema default, which broke Pay Bill everywhere.
async function findPayableRestaurant(idOrSlug, { populate } = {}) {
  const key = String(idOrSlug || '').trim();
  if (!key) return null;
  const q = mongoose.isValidObjectId(key)
    ? { _id: key, isActive: true }
    : { slug: key, isActive: true };
  let query = Restaurant.findOne(q);
  if (populate) query = query.populate(populate.path, populate.select);
  return query;
}

// ─── Public: Restaurants you can pay a bill at ────────────────────────────────
exports.getPayBillRestaurants = async (req, res, next) => {
  try {
    const { city, search } = req.query;
    // Pay Bill works at any live restaurant.
    const filter = {
      status: { $in: ['approved', 'active'] },
      isActive: true,
    };
    if (city)   filter['address.city'] = new RegExp(city, 'i');
    if (search) filter.name = new RegExp(search, 'i');

    const restaurants = await Restaurant.find(filter)
      .select('name address cuisine images logo averageRating totalReviews costForTwo priceRange')
      .sort({ averageRating: -1 })
      .limit(60)
      .lean();

    // Attach the best active pay-bill offer per restaurant, for the deal badge.
    const ids = restaurants.map((r) => r._id);
    const offers = await Offer.find({
      restaurant: { $in: ids },
      isActive: true,
      approvalStatus: 'approved',
      $and: [
        { $or: [{ applicableTo: { $exists: false } }, { applicableTo: { $size: 0 } }, { applicableTo: 'pay_bill' }] },
        { $or: [{ validFrom: { $exists: false } }, { validFrom: { $lte: new Date() } }] },
        { $or: [{ validTo: { $exists: false } }, { validTo: { $gte: new Date() } }] },
      ],
    }).select('restaurant title type discountValue maxDiscount minOrderAmount fundedBy code').lean();

    const byRestaurant = {};
    for (const o of offers) {
      const key = o.restaurant.toString();
      const score = o.type === 'percentage' ? o.discountValue : (o.discountValue || 0) / 100;
      if (!byRestaurant[key] || score > byRestaurant[key]._score) {
        byRestaurant[key] = { ...o, _score: score };
      }
    }

    const withOffers = restaurants.map((r) => {
      const o = byRestaurant[r._id.toString()];
      return {
        ...r,
        topOffer: o ? {
          title: o.title, type: o.type, discountValue: o.discountValue,
          maxDiscount: o.maxDiscount, minOrderAmount: o.minOrderAmount,
          fundedBy: o.fundedBy, code: o.code,
        } : null,
      };
    });

    return successResponse(res, 200, 'Pay Bill restaurants', { restaurants: withOffers });
  } catch (err) {
    next(err);
  }
};

// ─── Customer: Fetch bill → billStatus = 'open' ────────────────────────────────
// Creates a BillPayment draft so the customer can then apply an offer and pay.
exports.fetchBill = async (req, res, next) => {
  try {
    const { restaurantId, billAmount } = req.body;
    const amount = parseFloat(billAmount);
    if (!restaurantId || !amount || amount <= 0) {
      return errorResponse(res, 400, 'restaurantId and billAmount are required');
    }

    const restaurant = await findPayableRestaurant(restaurantId);
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');

    const billPayment = await BillPayment.create({
      customer:      req.user._id,
      restaurant:    restaurant._id,
      billAmount:    amount,
      finalAmount:   amount,         // no discount yet
      paymentMethod: 'razorpay',     // will be updated before payment
      billStatus:    'open',
      paymentStatus: 'pending',
    });

    return successResponse(res, 201, 'Bill fetched', {
      billPayment,
      restaurant: { _id: restaurant._id, name: restaurant.name },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Customer: Quote — full breakdown before paying (EasyDiner-style) ─────────
// GET /bill-payments/quote?restaurantId=&billAmount=&offerId=&offerCode=&tipAmount=
// The single source of truth for "You Pay": bill − discount + convenience fee
// + GST-on-fee + tip. The pay endpoint recomputes the same numbers server-side.
exports.quoteBill = async (req, res, next) => {
  try {
    const { restaurantId, offerId, offerCode } = req.query;
    const amount = parseFloat(req.query.billAmount);
    if (!restaurantId || !amount || amount <= 0) {
      return errorResponse(res, 400, 'restaurantId and billAmount are required');
    }
    const tip = Math.max(0, parseFloat(req.query.tipAmount) || 0);

    const restaurant = await findPayableRestaurant(restaurantId);
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');
    const rid = restaurant._id;

    let discountBreakup = { restaurantFunded: 0, platformFunded: 0, bankFunded: 0, total: 0 };
    let offer = null;
    let offerError = null;
    if (offerId || offerCode) {
      const r = await discountService.applyOffer({
        offerId, code: offerCode, restaurantId: rid, userId: req.user._id, amount, guests: 1,
      });
      if (r.error) offerError = r.error;
      else if (r.discountResult) {
        offer = r.offer;
        discountBreakup = {
          restaurantFunded: r.discountResult.restaurantFunded,
          platformFunded:   r.discountResult.platformFunded,
          bankFunded:       r.discountResult.bankFunded,
          total:            r.discountResult.totalDiscount,
        };
      }
    }

    const offerDiscount = discountBreakup.total;
    let appDiscount;
    let appDiscountLabel;
    ({ discountBreakup, appDiscount, appDiscountLabel } = await billingService.withAppDiscount(amount, discountBreakup, rid));

    const base = Math.max(0, billingService.r2(amount - discountBreakup.total));
    const {
      convenienceFee, gstAmount, gstOnFeePercent, toPay, convenienceFeeOriginal, convenienceFeeWaived,
    } = await billingService.computeCharges(base, tip);

    return successResponse(res, 200, 'Bill quote', {
      restaurant: { _id: restaurant._id, name: restaurant.name },
      billAmount: amount,
      discount: discountBreakup.total,   // offer + app discount
      offerDiscount,
      appDiscount,
      appDiscountLabel,
      discountBreakup,
      offer: offer ? {
        _id: offer._id, title: offer.title, type: offer.type,
        discountValue: offer.discountValue, fundedBy: offer.fundedBy, code: offer.code,
      } : null,
      offerError,
      convenienceFee,
      convenienceFeeOriginal,
      convenienceFeeWaived,
      gstAmount,
      gstOnFeePercent,
      tip,
      toPay,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Customer: Apply offer to bill → billStatus = 'preview' ───────────────────
exports.applyOffer = async (req, res, next) => {
  try {
    const { offerId, offerCode } = req.body;

    const billPayment = await BillPayment.findOne({ _id: req.params.id, customer: req.user._id });
    if (!billPayment) return errorResponse(res, 404, 'Bill payment not found');
    if (billPayment.billStatus === 'paid') return errorResponse(res, 400, 'Bill is already paid');

    const { offer, discountResult, error } = await discountService.applyOffer({
      offerId,
      code:         offerCode,
      restaurantId: billPayment.restaurant,
      userId:       req.user._id,
      amount:       billPayment.billAmount,
      guests:       1,
    });

    if (error) return errorResponse(res, 400, error);

    billPayment.offer = offer._id;
    billPayment.offerCode = offer.code;
    billPayment.discountBreakup = {
      restaurantFunded: discountResult.restaurantFunded,
      platformFunded:   discountResult.platformFunded,
      bankFunded:       discountResult.bankFunded,
      total:            discountResult.totalDiscount,
    };
    billPayment.finalAmount = parseFloat((billPayment.billAmount - discountResult.totalDiscount).toFixed(2));
    billPayment.billStatus  = 'preview';
    await billPayment.save();

    return successResponse(res, 200, 'Offer applied — preview ready', { billPayment });
  } catch (err) {
    next(err);
  }
};

// ─── Internal: finalise a paid bill (offer usage + invoice + cashback + email) ─
async function _settlePaidBill({
  req, restaurant, amount, tip, discountBreakup, offerBreakup, appDiscount, appDiscountLabel, appliedOffer,
  convenienceFee, gstAmount, finalAmount, method, reference,
}) {
  const billPayment = await BillPayment.create({
    customer:      req.user._id,
    restaurant:    restaurant._id,
    billAmount:    amount,
    offer:         appliedOffer?._id,
    offerCode:     appliedOffer?.code,
    discountBreakup,
    appDiscount,
    appDiscountLabel,
    tipAmount:     tip,
    convenienceFee,
    gstAmount,
    finalAmount,
    commissionPercentage: restaurant.commission || 10,
    paymentMethod: method,
    paymentStatus: 'paid',
    billStatus:    'paid',
    paymentReference: reference,
    paidAt:        new Date(),
  });

  if (appliedOffer) {
    discountService.recordOfferUsage({
      offer: appliedOffer, userId: req.user._id, restaurantId: restaurant._id,
      grossAmount: amount,
      // offer ledger records the offer's own discount, not the app discount
      discountResult: { totalDiscount: offerBreakup.total, ...offerBreakup },
      sourceType: 'bill_payment', sourceId: billPayment._id,
    }).catch(() => {});
  }

  const inv = await _generateBillInvoice(billPayment, restaurant);
  billPayment.invoice = inv._id;
  await billPayment.save();

  const cashback = await loyaltyService.awardBillPaymentCashback({
    userId: req.user._id,
    // Cashback on the food bill only — not the tip, fee or GST.
    amount: billingService.r2(finalAmount - tip - convenienceFee - gstAmount),
    restaurantName: restaurant.name,
    billPaymentId: billPayment._id,
  });

  emailService.sendBillPaymentEmails({
    billPayment, restaurant, customer: req.user, owner: restaurant.owner,
  }).catch(() => {});

  return { billPayment, cashback };
}

// ─── Customer: Pay bill (Razorpay order · Wallet · direct) ────────────────────
exports.createBillPayment = async (req, res, next) => {
  try {
    const { restaurantId, billAmount, offerId, offerCode, paymentMethod } = req.body;
    const amount = parseFloat(billAmount);
    if (!restaurantId || !amount || amount <= 0) {
      return errorResponse(res, 400, 'restaurantId and billAmount are required');
    }

    // Voluntary tip — optional, non-negative, sanity-capped.
    const tip = Math.round((Math.max(0, parseFloat(req.body.tipAmount) || 0)) * 100) / 100;
    if (tip > 100000) return errorResponse(res, 400, 'Tip amount is too large');

    const restaurant = await findPayableRestaurant(restaurantId, {
      populate: { path: 'owner', select: 'name email phone' },
    });
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');

    const rid = restaurant._id; // normalise: the body may carry a slug

    // Apply offer
    let discountBreakup = { restaurantFunded: 0, platformFunded: 0, bankFunded: 0, total: 0 };
    let appliedOffer = null;

    if (offerId || offerCode) {
      const { offer, discountResult, error } = await discountService.applyOffer({
        offerId, code: offerCode,
        restaurantId: rid, userId: req.user._id,
        amount, guests: 1,
      });
      if (!error && discountResult) {
        appliedOffer = offer;
        discountBreakup = {
          restaurantFunded: discountResult.restaurantFunded,
          platformFunded:   discountResult.platformFunded,
          bankFunded:       discountResult.bankFunded,
          total:            discountResult.totalDiscount,
        };
      }
    }

    // Hungora app discount (admin setting), platform-funded, on top of the offer.
    const offerBreakup = discountBreakup;
    let appDiscount;
    let appDiscountLabel;
    ({ discountBreakup, appDiscount, appDiscountLabel } = await billingService.withAppDiscount(amount, discountBreakup, rid));

    // EasyDiner-style total: (bill − discount) + convenience fee + GST-on-fee + tip.
    const base = Math.max(0, billingService.r2(amount - discountBreakup.total));
    const { convenienceFee, gstAmount, toPay } = await billingService.computeCharges(base, tip);
    const finalAmount = toPay;

    const settle = (method, reference) => _settlePaidBill({
      req, restaurant, amount, tip, discountBreakup, offerBreakup, appDiscount, appDiscountLabel, appliedOffer,
      convenienceFee, gstAmount, finalAmount, method, reference,
    });

    // ── Wallet — debit + settle immediately ──────────────────────────────────
    if (paymentMethod === 'wallet') {
      const wallet = await Wallet.findOne({ user: req.user._id });
      if (!wallet) return errorResponse(res, 404, 'Wallet not found');
      if (wallet.balance < finalAmount) {
        return errorResponse(res, 400, `Insufficient balance. Available: ₹${wallet.balance}`);
      }
      await wallet.debit(finalAmount, `Pay Bill at ${restaurant.name}`);

      const { billPayment, cashback } = await settle('wallet', 'WALLET');
      return successResponse(res, 201, 'Payment successful', {
        billPayment,
        coinsEarned: cashback?.coins || 0,
        walletBalance: cashback?.walletBalance,
      });
    }

    // ── Razorpay — only when a live gateway is actually configured ───────────
    const settings = await billingService.getSettings();
    const razorpayLive = Boolean(process.env.RAZORPAY_KEY_ID) && settings.enableRazorpay !== false;

    if (razorpayLive) {
      const order = await getRazorpay().orders.create({
        amount:   Math.round(finalAmount * 100),
        currency: 'INR',
        receipt:  `bp_${Date.now()}`,
      });

      const billPayment = await BillPayment.create({
        customer:      req.user._id,
        restaurant:    rid,
        billAmount:    amount,
        offer:         appliedOffer?._id,
        offerCode:     appliedOffer?.code,
        discountBreakup,
        appDiscount,
        appDiscountLabel,
        tipAmount:     tip,
        convenienceFee,
        gstAmount,
        finalAmount,
        commissionPercentage: restaurant.commission || 10,
        paymentMethod: paymentMethod || 'razorpay',
        paymentStatus: 'pending',
        billStatus:    'preview',
        razorpayOrderId: order.id,
      });

      return successResponse(res, 201, 'Order created', {
        billPayment,
        razorpay: { orderId: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID },
      });
    }

    // ── No live gateway: refuse. A bill is never marked paid without a verified payment. ──
    return errorResponse(res, 503, 'Online payment is not available right now. Please try again later.');
  } catch (err) {
    next(err);
  }
};

// ─── Bill payments: mark paid exactly once, then run the post-payment work ─────
// Used by the customer's complete call and by the Razorpay webhook (payment.captured).
// Returns null if the bill is already paid, so repeated calls never duplicate invoices or cashback.
async function finalizeBillPayment(billPaymentId, { razorpayPaymentId, razorpaySignature, paymentReference, customer }) {
  const fields = {
    razorpayPaymentId,
    paymentStatus:    'paid',
    billStatus:       'paid',
    paymentReference: paymentReference || razorpayPaymentId,
    paidAt:           new Date(),
  };
  if (razorpaySignature) fields.razorpaySignature = razorpaySignature;

  const billPayment = await BillPayment.findOneAndUpdate(
    { _id: billPaymentId, paymentStatus: { $ne: 'paid' } },
    fields,
    { new: true }
  );
  if (!billPayment) return null;

  // Record offer usage
  if (billPayment.offer) {
    const offer = await Offer.findById(billPayment.offer);
    if (offer) {
      discountService.recordOfferUsage({
        offer, userId: billPayment.customer, restaurantId: billPayment.restaurant,
        grossAmount: billPayment.billAmount,
        // offer's own discount only — strip the app discount back out
        discountResult: {
          totalDiscount:    (billPayment.discountBreakup?.total ?? 0) - (billPayment.appDiscount || 0),
          restaurantFunded: billPayment.discountBreakup?.restaurantFunded ?? 0,
          platformFunded:   (billPayment.discountBreakup?.platformFunded ?? 0) - (billPayment.appDiscount || 0),
          bankFunded:       billPayment.discountBreakup?.bankFunded ?? 0,
        },
        sourceType: 'bill_payment', sourceId: billPayment._id,
      }).catch(() => {});
    }
  }

  const restaurant = await Restaurant.findById(billPayment.restaurant).populate('owner', 'name email phone');
  const inv = await _generateBillInvoice(billPayment, restaurant);
  billPayment.invoice = inv._id;
  await billPayment.save();

  const cashback = await loyaltyService.awardBillPaymentCashback({
    userId: billPayment.customer,
    amount: billingService.r2(
      billPayment.finalAmount - (billPayment.tipAmount || 0)
      - (billPayment.convenienceFee || 0) - (billPayment.gstAmount || 0),
    ),
    restaurantName: restaurant?.name,
    billPaymentId: billPayment._id,
  });

  emailService.sendBillPaymentEmails({
    billPayment, restaurant, customer, owner: restaurant?.owner,
  }).catch(() => {});

  return { billPayment, cashback };
}
exports.finalizeBillPayment = finalizeBillPayment;

// ─── Customer: Verify Razorpay + complete bill payment ───────────────────────
exports.completeBillPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentReference } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return errorResponse(res, 400, 'razorpayOrderId, razorpayPaymentId and razorpaySignature are required');
    }
    if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      return errorResponse(res, 400, 'Invalid payment signature');
    }

    // Only the customer who created this bill order can complete it.
    const billPayment = await BillPayment.findOne({ razorpayOrderId, customer: req.user._id });
    if (!billPayment) return errorResponse(res, 404, 'Bill payment not found');

    const result = await finalizeBillPayment(billPayment._id, {
      razorpayPaymentId, razorpaySignature, paymentReference, customer: req.user,
    });
    if (!result) return errorResponse(res, 400, 'Already completed');

    await result.billPayment.populate('restaurant', 'name address');
    return successResponse(res, 200, 'Payment completed', {
      billPayment: result.billPayment,
      coinsEarned: result.cashback?.coins || 0,
      walletBalance: result.cashback?.walletBalance,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Customer: My bill payment history ────────────────────────────────────────
exports.getMyBillPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const total = await BillPayment.countDocuments({ customer: req.user._id });
    const payments = await BillPayment.find({ customer: req.user._id })
      .populate('restaurant', 'name address images logo')
      .populate('offer',      'title discountValue type fundedBy')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return successResponse(res, 200, 'Bill payments', {
      payments,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Owner: Restaurant's bill payments ────────────────────────────────────────
exports.getRestaurantBillPayments = async (req, res, next) => {
  try {
    const { restaurantId, page = 1, limit = 20 } = req.query;
    if (!(await Restaurant.findOne({ _id: restaurantId, owner: req.user._id }))) {
      return errorResponse(res, 403, 'Access denied');
    }

    const filter = { restaurant: restaurantId, paymentStatus: 'paid' };
    const total = await BillPayment.countDocuments(filter);
    const payments = await BillPayment.find(filter)
      .populate('customer', 'name phone')
      .populate('offer',    'title code fundedBy')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const stats = await BillPayment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue:         { $sum: '$finalAmount' },
          totalTips:            { $sum: '$tipAmount' },
          totalRestaurantDiscount: { $sum: '$discountBreakup.restaurantFunded' },
          totalPlatformDiscount:   { $sum: '$discountBreakup.platformFunded' },
          count: { $sum: 1 },
        },
      },
    ]);

    return successResponse(res, 200, 'Restaurant bill payments', {
      payments,
      stats: stats[0] || { totalRevenue: 0, totalTips: 0, totalRestaurantDiscount: 0, totalPlatformDiscount: 0, count: 0 },
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Owner: Toggle Pay Bill on/off ────────────────────────────────────────────
exports.togglePayBill = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ _id: req.params.id, owner: req.user._id });
    if (!restaurant) return errorResponse(res, 403, 'Access denied');
    restaurant.payBillEnabled = !restaurant.payBillEnabled;
    await restaurant.save();
    return successResponse(res, 200, `Pay Bill ${restaurant.payBillEnabled ? 'enabled' : 'disabled'}`, {
      payBillEnabled: restaurant.payBillEnabled,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Internal: Auto-generate Invoice after bill payment ───────────────────────
async function _generateBillInvoice(billPayment, restaurant) {
  const commissionRate = restaurant?.commission || billPayment.commissionPercentage || 10;
  const ownerDiscount  = billPayment.discountBreakup?.restaurantFunded ?? 0;
  const tipAmount      = billPayment.tipAmount || 0;
  const convenienceFee = billPayment.convenienceFee || 0;
  const gstAmount      = billPayment.gstAmount || 0;
  const commissionBase = Math.max(0, billPayment.billAmount - ownerDiscount);
  const commissionAmount = parseFloat(((commissionBase * commissionRate) / 100).toFixed(2));

  const invoice = await Invoice.create({
    booking:             billPayment._id,   // using bill payment ID as booking reference
    customer:            billPayment.customer,
    restaurant:          billPayment.restaurant,
    generatedBy:         billPayment.customer,
    grossAmount:         billPayment.billAmount,
    discountBreakup:     billPayment.discountBreakup ?? {},
    taxPercentage:       0,
    taxAmount:           0,
    tipAmount,
    convenienceFee,
    gstAmount,
    netPaid:             billPayment.finalAmount,
    offer:               billPayment.offer,
    offerCode:           billPayment.offerCode,
    commissionPercentage: commissionRate,
    commissionBase,
    commissionAmount,
    restaurantReceivable: parseFloat((commissionBase - commissionAmount + tipAmount).toFixed(2)),
    paymentMethod:        billPayment.paymentMethod,
    paymentStatus:        'paid',
    status:               'paid',
    isLocked:             true,
    settlementStatus:     'pending',
    paidAt:               billPayment.paidAt,
  });

  // Create commission record
  await commissionService.createFromInvoice(invoice);

  return invoice;
}
