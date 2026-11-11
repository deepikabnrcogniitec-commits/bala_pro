const Invoice = require('../models/Invoice');
const Booking = require('../models/Booking');
const Offer = require('../models/Offer');
const Restaurant = require('../models/Restaurant');
const commissionService = require('../services/commission.service');
const discountService = require('../services/discount.service');
const { successResponse, errorResponse } = require('../utils/response');

// ─── Owner: Generate invoice for a booking ────────────────────────────────────
exports.generateInvoice = async (req, res, next) => {
  try {
    const { bookingId, grossAmount, items, offerCode, paymentMethod, taxPercentage, notes } = req.body;

    const booking = await Booking.findById(bookingId).populate('restaurant');
    if (!booking) return errorResponse(res, 404, 'Booking not found');

    if (booking.restaurant.owner.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Access denied');
    }
    if (!['confirmed', 'seated'].includes(booking.status)) {
      return errorResponse(res, 400, 'Invoice can only be generated for confirmed or seated bookings');
    }
    const existing = await Invoice.findOne({ booking: bookingId, status: { $ne: 'cancelled' } });
    if (existing) return errorResponse(res, 409, 'Invoice already exists for this booking');

    const restaurant = booking.restaurant;
    const commissionRate = restaurant.commission || 10;
    const gstRate = taxPercentage ?? 5;

    // Resolve discount via offer
    let discountBreakup = { restaurantFunded: 0, platformFunded: 0, bankFunded: 0, total: 0 };
    let offerId = null;
    let appliedOffer = null;

    if (offerCode) {
      const { offer, discountResult, error } = await discountService.applyOffer({
        code: offerCode,
        restaurantId: restaurant._id,
        userId: booking.customer,
        amount: grossAmount,
        guests: booking.guests,
      });
      if (!error && discountResult) {
        appliedOffer = offer;
        offerId = offer._id;
        discountBreakup = {
          restaurantFunded: discountResult.restaurantFunded,
          platformFunded:   discountResult.platformFunded,
          bankFunded:       discountResult.bankFunded,
          total:            discountResult.totalDiscount,
        };
      }
    }

    const afterDiscount = grossAmount - discountBreakup.total;
    const taxAmount = parseFloat(((afterDiscount * gstRate) / 100).toFixed(2));
    const netPaid   = parseFloat((afterDiscount + taxAmount).toFixed(2));

    // commissionBase excludes only restaurant-funded discount
    const commissionBase   = parseFloat((grossAmount - discountBreakup.restaurantFunded).toFixed(2));
    const commissionAmount = parseFloat(((commissionBase * commissionRate) / 100).toFixed(2));
    const restaurantReceivable = parseFloat((commissionBase - commissionAmount).toFixed(2));

    const invoice = await Invoice.create({
      booking:              bookingId,
      customer:             booking.customer,
      restaurant:           restaurant._id,
      generatedBy:          req.user._id,
      items:                items || [],
      grossAmount,
      discountBreakup,
      taxPercentage:        gstRate,
      taxAmount,
      netPaid,
      offer:                offerId,
      offerCode:            offerCode?.toUpperCase(),
      commissionPercentage: commissionRate,
      commissionBase,
      commissionAmount,
      restaurantReceivable,
      paymentMethod:        paymentMethod || 'cash',
      status:               'sent',
      settlementStatus:     'pending',
      notes,
    });

    if (booking.status === 'confirmed') {
      await Booking.findByIdAndUpdate(bookingId, { status: 'seated' });
    }

    // Record offer usage
    if (appliedOffer) {
      discountService.recordOfferUsage({
        offer: appliedOffer,
        userId: booking.customer,
        restaurantId: restaurant._id,
        grossAmount,
        discountResult: {
          totalDiscount:    discountBreakup.total,
          restaurantFunded: discountBreakup.restaurantFunded,
          platformFunded:   discountBreakup.platformFunded,
          bankFunded:       discountBreakup.bankFunded,
        },
        sourceType: 'booking',
        sourceId:   booking._id,
      }).catch(() => {});
    }

    await invoice.populate([
      { path: 'booking',     select: 'bookingId date time guests' },
      { path: 'customer',    select: 'name phone email' },
      { path: 'restaurant',  select: 'name address' },
    ]);

    return successResponse(res, 201, 'Invoice generated', { invoice });
  } catch (err) {
    next(err);
  }
};

// ─── Owner: Mark invoice as paid → lock + complete booking + create commission ─
exports.markInvoicePaid = async (req, res, next) => {
  try {
    const { paymentMethod } = req.body;
    const invoice = await Invoice.findById(req.params.id).populate('restaurant');
    if (!invoice) return errorResponse(res, 404, 'Invoice not found');
    if (invoice.restaurant.owner.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Access denied');
    }
    if (invoice.paymentStatus === 'paid') return errorResponse(res, 400, 'Invoice already paid');

    invoice.paymentStatus = 'paid';
    invoice.status        = 'paid';
    invoice.isLocked      = true;
    invoice.paidAt        = new Date();
    invoice.settlementStatus = 'pending';
    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    await invoice.save();

    await Booking.findByIdAndUpdate(invoice.booking, {
      status: 'completed',
      isPaid: true,
      totalAmount: invoice.netPaid,
    });

    await commissionService.createFromInvoice(invoice);

    return successResponse(res, 200, 'Invoice marked as paid', { invoice });
  } catch (err) {
    next(err);
  }
};

// ─── Owner: Manually lock an invoice (prevents further edits) ─────────────────
exports.lockInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('restaurant');
    if (!invoice) return errorResponse(res, 404, 'Invoice not found');
    if (invoice.restaurant.owner.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Access denied');
    }
    if (invoice.isLocked) return errorResponse(res, 400, 'Invoice is already locked');

    invoice.isLocked = true;
    invoice.status   = 'locked';
    await invoice.save();

    return successResponse(res, 200, 'Invoice locked', { invoice });
  } catch (err) {
    next(err);
  }
};

// ─── Owner: Get restaurant invoices ──────────────────────────────────────────
exports.getRestaurantInvoices = async (req, res, next) => {
  try {
    const { restaurantId, status, settlementStatus, page = 1, limit = 20 } = req.query;
    if (!(await Restaurant.findOne({ _id: restaurantId, owner: req.user._id }))) {
      return errorResponse(res, 403, 'Access denied');
    }

    const filter = { restaurant: restaurantId };
    if (status) filter.status = status;
    if (settlementStatus) filter.settlementStatus = settlementStatus;

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate('customer', 'name phone')
      .populate('booking', 'bookingId date time guests')
      .populate('offer', 'title code fundedBy')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return successResponse(res, 200, 'Invoices fetched', {
      invoices,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Customer / Owner: Get single invoice ─────────────────────────────────────
exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('booking',    'bookingId date time guests status')
      .populate('customer',   'name phone email')
      .populate('restaurant', 'name address phone')
      .populate('offer',      'title code discountValue type fundedBy');

    if (!invoice) return errorResponse(res, 404, 'Invoice not found');

    const isCustomer = invoice.customer._id.toString() === req.user._id.toString();
    const isOwner    = invoice.generatedBy.toString()  === req.user._id.toString();
    if (!isCustomer && !isOwner && req.user.role !== 'admin') {
      return errorResponse(res, 403, 'Access denied');
    }

    return successResponse(res, 200, 'Invoice fetched', { invoice });
  } catch (err) {
    next(err);
  }
};

// ─── Customer: Get invoice by booking ────────────────────────────────────────
exports.getInvoiceByBooking = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ booking: req.params.bookingId })
      .populate('booking',    'bookingId date time guests status')
      .populate('restaurant', 'name address phone')
      .populate('offer',      'title code discountValue type fundedBy');

    if (!invoice) return errorResponse(res, 404, 'Invoice not generated yet');
    return successResponse(res, 200, 'Invoice fetched', { invoice });
  } catch (err) {
    next(err);
  }
};

// ─── Owner: Cancel invoice ────────────────────────────────────────────────────
exports.cancelInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('restaurant');
    if (!invoice) return errorResponse(res, 404, 'Invoice not found');
    if (invoice.restaurant.owner.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Access denied');
    }
    if (invoice.paymentStatus === 'paid') return errorResponse(res, 400, 'Cannot cancel a paid invoice');
    if (invoice.isLocked) return errorResponse(res, 400, 'Cannot cancel a locked invoice');

    invoice.status = 'cancelled';
    await invoice.save();

    return successResponse(res, 200, 'Invoice cancelled', { invoice });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: All invoices ──────────────────────────────────────────────────────
exports.getAllInvoices = async (req, res, next) => {
  try {
    const { status, settlementStatus, restaurantId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (settlementStatus) filter.settlementStatus = settlementStatus;
    if (restaurantId) filter.restaurant = restaurantId;

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate('customer',   'name')
      .populate('restaurant', 'name')
      .populate('booking',    'bookingId date')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return successResponse(res, 200, 'All invoices', {
      invoices,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};
