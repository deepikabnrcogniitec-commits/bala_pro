const Booking = require('../models/Booking');
const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');
const Notification = require('../models/Notification');
const discountService = require('../services/discount.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { sendBookingConfirmationEmail } = require('../services/email.service');
const { sendPushNotification } = require('../config/firebase');
const logger = require('../utils/logger');
const { refundBookingDeposit } = require('../services/depositRefund.service');
const { HOLD_MINUTES } = require('../services/holdRelease.service');

// ─── Shared: check if a table/slot is free ────────────────────────────────────
// Bookings that hold a table. A 'held' booking only counts while its 5-minute window is still open,
// so an abandoned hold never blocks the table once it has expired.
const activeBookingFilter = (now = new Date()) => ({
  $or: [
    { status: { $in: ['pending', 'confirmed', 'seated'] } },
    { status: 'held', holdExpiresAt: { $gt: now } },
  ],
});

const hasConflict = (tableId, date, time, excludeBookingId) =>
  Booking.exists({
    table: tableId,
    date,
    time,
    ...activeBookingFilter(),
    ...(excludeBookingId && { _id: { $ne: excludeBookingId } }),
  });

// ─── Notify restaurant owner (non-blocking) ───────────────────────────────────
const notifyOwner = async (booking, restaurant) => {
  try {
    const owner = await require('../models/User').findById(restaurant.owner);
    if (!owner) return;

    await Notification.create({
      recipient: owner._id,
      title: 'New Booking Request',
      body: `${booking.guests} guests on ${booking.date} at ${booking.time}`,
      type: 'booking_confirmed',
      data: { bookingId: booking._id },
      channel: 'in-app',
    });

    if (owner.fcmTokens?.length > 0) {
      sendPushNotification(
        owner.fcmTokens[0],
        '🍽️ New Booking!',
        `${booking.guests} guests booked for ${booking.date} at ${booking.time}`,
        { bookingId: booking._id.toString() }
      ).catch(() => {});
    }
  } catch {}
};

// ─── Customer: Temporary Hold (Step 1 of booking) ────────────────────────────
// Locks the table for 5 minutes while the customer completes deposit payment.
// A cron job in holdRelease.service.js auto-releases expired holds.
exports.holdBooking = async (req, res, next) => {
  try {
    const {
      restaurantId, branchId, tableId,
      date, time, guests, specialRequest, occasion,
      paymentMethod, bookingSource,
    } = req.body;

    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      status: { $in: ['approved', 'active'] },
      isActive: true,
    });
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found or unavailable');

    // A hold exists only for deposit bookings. The amount comes from the restaurant settings, never the client.
    const depositAmount = Number(restaurant.bookingSettings?.depositAmount) || 0;
    if (!restaurant.bookingSettings?.depositRequired || depositAmount <= 0) {
      return errorResponse(res, 400, 'This restaurant does not take a booking deposit. Confirm the booking directly.');
    }
    // The deposit is paid online, so the method must be wallet or Razorpay.
    const method = paymentMethod === 'wallet' ? 'wallet' : 'razorpay';

    if (tableId) {
      const table = await Table.findById(tableId);
      if (!table?.isActive) return errorResponse(res, 400, 'Table is not available');
      if (table.capacity < guests) return errorResponse(res, 400, `Table only fits ${table.capacity} guests`);
      if (await hasConflict(tableId, date, time)) {
        return errorResponse(res, 409, 'Table is already booked for that time');
      }
    }

    const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);

    const booking = await Booking.create({
      customer:      req.user._id,
      restaurant:    restaurantId,
      branch:        branchId,
      table:         tableId,
      date,
      time,
      guests,
      specialRequest,
      occasion,
      paymentMethod: method,
      bookingSource: bookingSource || 'mobile',
      depositAmount,
      totalAmount:   depositAmount,
      status:        'held',
      holdStatus:    'held',
      holdExpiresAt,
      statusHistory: [{ status: 'held', changedBy: req.user._id, reason: 'Table held while deposit is paid' }],
    });

    return successResponse(res, 201, `Table held for ${HOLD_MINUTES} minutes`, {
      booking,
      holdExpiresAt,
      requiresDeposit: true,
      depositAmount,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Customer: Release Hold early ─────────────────────────────────────────────
exports.releaseHold = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, customer: req.user._id });
    if (!booking) return errorResponse(res, 404, 'Booking not found');
    if (booking.status !== 'held') return errorResponse(res, 400, 'Booking is not in held state');

    booking.status = 'cancelled';
    booking.holdStatus = 'released';
    booking.cancelledAt = new Date();
    booking.cancellationReason = 'Customer released hold';
    booking.cancelledBy = req.user._id;
    booking.statusHistory.push({ status: 'cancelled', changedBy: req.user._id, reason: 'Released by customer' });
    await booking.save();

    return successResponse(res, 200, 'Hold released', { booking });
  } catch (err) {
    next(err);
  }
};

// ─── Customer: Confirm Booking (Step 2 — after deposit or for no-deposit flow) ─
exports.createBooking = async (req, res, next) => {
  try {
    const {
      restaurantId, branchId, tableId,
      date, time, guests, specialRequest, occasion,
      couponCode, paymentMethod, depositAmount, bookingSource,
    } = req.body;

    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      status: { $in: ['approved', 'active'] },
      isActive: true,
    });
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found or unavailable');

    if (tableId) {
      const table = await Table.findById(tableId);
      if (!table?.isActive) return errorResponse(res, 400, 'Selected table is not available');
      if (table.capacity < guests) return errorResponse(res, 400, `Table only fits ${table.capacity} guests`);
      if (await hasConflict(tableId, date, time)) {
        return errorResponse(res, 409, 'This table is already booked for the selected time');
      }
    }

    // Apply offer
    let discountBreakup = { restaurantFunded: 0, platformFunded: 0, bankFunded: 0, total: 0 };
    let appliedOffer = null;

    if (couponCode) {
      const { offer, discountResult, error } = await discountService.applyOffer({
        code: couponCode,
        restaurantId,
        userId: req.user._id,
        amount: depositAmount || 0,
        guests,
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

    const commissionRate = restaurant.commission || 10;
    const netDeposit = Math.max(0, (depositAmount || 0) - discountBreakup.total);
    const commissionAmount = parseFloat(((netDeposit * commissionRate) / 100).toFixed(2));

    const booking = await Booking.create({
      customer:        req.user._id,
      restaurant:      restaurantId,
      branch:          branchId,
      table:           tableId,
      date,
      time,
      guests,
      specialRequest,
      occasion,
      couponCode,
      discountAmount:  discountBreakup.total,
      depositAmount:   depositAmount || 0,
      totalAmount:     netDeposit,
      paymentMethod:   paymentMethod || 'cash',
      bookingSource:   bookingSource || 'mobile',
      status:          'pending',
      holdStatus:      'none',
      commissionAmount,
      statusHistory:   [{ status: 'pending', changedBy: req.user._id }],
    });

    // Record offer usage after booking is saved
    if (appliedOffer) {
      discountService.recordOfferUsage({
        offer: appliedOffer,
        userId: req.user._id,
        restaurantId,
        grossAmount: depositAmount || 0,
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

    await Restaurant.findByIdAndUpdate(restaurantId, { $inc: { totalBookings: 1 } });
    notifyOwner(booking, restaurant);
    sendBookingConfirmationEmail(req.user, {
      bookingId: booking.bookingId,
      restaurantName: restaurant.name,
      date, time, guests,
    }).catch(() => {});

    await booking.populate('restaurant', 'name address');
    return successResponse(res, 201, 'Booking created successfully', { booking });
  } catch (err) {
    next(err);
  }
};

// ─── Customer: Get my bookings ────────────────────────────────────────────────
exports.getMyBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { customer: req.user._id };
    if (status) query.status = { $in: status.split(',') };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('restaurant', 'name images address')
        .populate('table', 'name number capacity type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(query),
    ]);

    return paginatedResponse(res, { bookings }, page, limit, total);
  } catch (err) {
    next(err);
  }
};

// ─── Customer / Owner: Get booking by ID ─────────────────────────────────────
exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('restaurant', 'name images address contact')
      .populate('table', 'name number capacity type')
      .populate('customer', 'name email phone avatar');

    if (!booking) return errorResponse(res, 404, 'Booking not found');

    const isOwnerOrAdmin = ['owner', 'admin'].includes(req.user.role);
    const isCustomer = booking.customer._id.toString() === req.user._id.toString();
    if (!isOwnerOrAdmin && !isCustomer) return errorResponse(res, 403, 'Access denied');

    return successResponse(res, 200, 'Booking fetched', { booking });
  } catch (err) {
    next(err);
  }
};

// ─── Customer: Cancel booking ─────────────────────────────────────────────────
exports.cancelBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, customer: req.user._id });
    if (!booking) return errorResponse(res, 404, 'Booking not found');
    if (!['held', 'pending', 'confirmed'].includes(booking.status)) {
      return errorResponse(res, 400, 'Cannot cancel this booking');
    }

    // A paid deposit goes back to the customer before the cancellation is saved.
    // If the refund fails, the booking is left as it was so the customer can try again.
    if (booking.isPaid) {
      try {
        await refundBookingDeposit(booking._id, reason || 'Booking cancelled by customer');
      } catch (err) {
        logger.error(`Deposit refund failed for booking ${booking._id}: ${err.message}`);
        return errorResponse(res, 502, 'We could not refund your deposit, so the booking was not cancelled. Please try again shortly.');
      }
    }

    booking.status = 'cancelled';
    booking.holdStatus = booking.holdStatus === 'held' ? 'released' : booking.holdStatus;
    booking.cancellationReason = reason;
    booking.cancelledAt = new Date();
    booking.cancelledBy = req.user._id;
    booking.statusHistory.push({ status: 'cancelled', changedBy: req.user._id, reason });
    await booking.save();

    // Reverse discount ledger entry if coupon was used
    if (booking.couponCode) {
      discountService.reverseOfferUsage({
        sourceType: 'booking',
        sourceId: booking._id,
        reason: 'Booking cancelled by customer',
      }).catch(() => {});
    }

    return successResponse(res, 200, 'Booking cancelled', { booking });
  } catch (err) {
    next(err);
  }
};

// ─── Owner: Get restaurant bookings ──────────────────────────────────────────
exports.getRestaurantBookings = async (req, res, next) => {
  try {
    const { restaurantId, status, date, page = 1, limit = 20 } = req.query;
    if (!(await Restaurant.findOne({ _id: restaurantId, owner: req.user._id }))) {
      return errorResponse(res, 403, 'Access denied');
    }

    const query = { restaurant: restaurantId };
    if (status) query.status = { $in: status.split(',') };
    if (date) query.date = date;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('customer', 'name phone email avatar')
        .populate('table', 'name number capacity')
        .sort({ date: 1, time: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(query),
    ]);

    return paginatedResponse(res, { bookings }, page, limit, total);
  } catch (err) {
    next(err);
  }
};

// ─── Owner: Update booking status ────────────────────────────────────────────
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status, reason, notes } = req.body;
    const allowed = ['confirmed', 'seated', 'completed', 'cancelled', 'no-show'];
    if (!allowed.includes(status)) return errorResponse(res, 400, 'Invalid status');

    const booking = await Booking.findById(req.params.id).populate('restaurant');
    if (!booking) return errorResponse(res, 404, 'Booking not found');

    const isAdmin = req.user.role === 'admin';
    const isOwner = booking.restaurant.owner.toString() === req.user._id.toString();
    if (!isOwner && !isAdmin) return errorResponse(res, 403, 'Access denied');

    if (status === 'cancelled' && booking.isPaid) {
      try {
        await refundBookingDeposit(booking._id, reason || 'Booking cancelled by restaurant');
      } catch (err) {
        logger.error(`Deposit refund failed for booking ${booking._id}: ${err.message}`);
        return errorResponse(res, 502, 'We could not refund the deposit, so the booking was not cancelled. Please try again shortly.');
      }
    }

    booking.status = status;
    booking.holdStatus = status === 'confirmed' ? 'confirmed' : booking.holdStatus;
    if (status === 'confirmed') booking.confirmedAt = new Date();
    if (status === 'cancelled') {
      booking.cancelledAt = new Date();
      booking.cancellationReason = reason;
    }
    if (notes) booking.ownerNotes = notes;
    booking.statusHistory.push({ status, changedBy: req.user._id, reason });
    await booking.save();

    // Notify customer
    const notifType = status === 'confirmed' ? 'booking_confirmed'
      : status === 'cancelled' ? 'booking_cancelled'
      : status === 'no-show' ? 'booking_no_show'
      : 'system';

    await Notification.create({
      recipient: booking.customer,
      title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      body: `Your booking #${booking.bookingId} has been ${status}`,
      type: notifType,
      data: { bookingId: booking._id },
      channel: 'in-app',
    });

    return successResponse(res, 200, `Booking ${status}`, { booking });
  } catch (err) {
    next(err);
  }
};

// ─── Owner: Today's bookings summary ─────────────────────────────────────────
exports.getTodaysBookings = async (req, res, next) => {
  try {
    const { restaurantId } = req.query;
    if (!(await Restaurant.findOne({ _id: restaurantId, owner: req.user._id }))) {
      return errorResponse(res, 403, 'Access denied');
    }

    const today = new Date().toISOString().split('T')[0];
    const bookings = await Booking.find({ restaurant: restaurantId, date: today })
      .populate('customer', 'name phone avatar')
      .populate('table', 'name number')
      .sort({ time: 1 });

    const summary = {
      total:       bookings.length,
      confirmed:   bookings.filter((b) => b.status === 'confirmed').length,
      pending:     bookings.filter((b) => b.status === 'pending').length,
      seated:      bookings.filter((b) => b.status === 'seated').length,
      cancelled:   bookings.filter((b) => b.status === 'cancelled').length,
      totalGuests: bookings.reduce((s, b) => s + b.guests, 0),
    };

    return successResponse(res, 200, "Today's bookings", { bookings, summary });
  } catch (err) {
    next(err);
  }
};

// ─── Public: Table availability ───────────────────────────────────────────────
exports.getAvailability = async (req, res, next) => {
  try {
    const restaurantId = req.params.id || req.query.restaurantId;
    const { branchId, date, guests } = req.query;

    const tables = await Table.find({
      restaurant: restaurantId,
      ...(branchId && { branch: branchId }),
      isActive: true,
      capacity: { $gte: parseInt(guests) || 1 },
    });

    const bookedTableIds = await Booking.find({
      restaurant: restaurantId,
      date,
      ...activeBookingFilter(),
    }).distinct('table');

    const bookedSet = new Set(bookedTableIds.map((id) => id.toString()));
    const tablesWithAvailability = tables.map((t) => ({
      ...t.toObject(),
      isAvailable: !bookedSet.has(t._id.toString()),
    }));

    const availableSlots = [
      '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM',
      '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM',
    ];

    return successResponse(res, 200, 'Availability fetched', { tables: tablesWithAvailability, availableSlots });
  } catch (err) {
    next(err);
  }
};

// ─── Customer: Reschedule booking ─────────────────────────────────────────────
exports.rescheduleBooking = async (req, res, next) => {
  try {
    const { date, time, guests } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, customer: req.user._id });
    if (!booking) return errorResponse(res, 404, 'Booking not found');
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return errorResponse(res, 400, 'Cannot reschedule this booking');
    }

    if (booking.table && (date || time)) {
      const checkDate = date || booking.date;
      const checkTime = time || booking.time;
      const conflict = await hasConflict(booking.table, checkDate, checkTime, booking._id);
      if (conflict) return errorResponse(res, 409, 'Table is already booked for the new time');
    }

    if (date) booking.date = date;
    if (time) booking.time = time;
    if (guests) booking.guests = guests;
    booking.statusHistory.push({ status: booking.status, changedBy: req.user._id, reason: 'Rescheduled by customer' });
    await booking.save();

    return successResponse(res, 200, 'Booking rescheduled', { booking });
  } catch (err) {
    next(err);
  }
};

module.exports = exports;
