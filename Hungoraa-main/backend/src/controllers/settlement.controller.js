const Settlement = require('../models/Settlement');
const Commission = require('../models/Commission');
const Invoice = require('../models/Invoice');
const Restaurant = require('../models/Restaurant');
const Notification = require('../models/Notification');
const commissionService = require('../services/commission.service');
const { successResponse, errorResponse } = require('../utils/response');

// ─── Admin: Create settlement for a restaurant + period ───────────────────────
exports.createSettlement = async (req, res, next) => {
  try {
    const { restaurantId, periodFrom, periodTo, notes } = req.body;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');

    // Check no overlapping open settlement exists
    const overlap = await Settlement.findOne({
      restaurant: restaurantId,
      status: { $in: ['pending', 'processing', 'generated'] },
      periodFrom: { $lte: new Date(periodTo) },
      periodTo:   { $gte: new Date(periodFrom) },
    });
    if (overlap) return errorResponse(res, 409, 'An open settlement already exists for this period');

    const agg = await commissionService.aggregatePending({
      restaurantId,
      from: periodFrom,
      to:   periodTo,
    });
    if (!agg) return errorResponse(res, 400, 'No pending commissions found for this period');

    const settlement = await Settlement.create({
      restaurant:           restaurantId,
      periodFrom:           new Date(periodFrom),
      periodTo:             new Date(periodTo),
      commissions:          agg.commissions.map((c) => c._id),
      invoices:             agg.invoiceIds,
      totalBookings:        agg.totalBookings,
      totalGrossAmount:     agg.totalGrossAmount,
      totalOwnerDiscount:   agg.totalOwnerDiscount,
      totalPlatformDiscount:agg.totalPlatformDiscount,
      totalCommission:      agg.totalCommission,
      ownerReceivable:      agg.ownerReceivable,
      processedBy:          req.user._id,
      notes,
      status: 'pending',
      settlementHistory: [{ status: 'pending', changedBy: req.user._id, timestamp: new Date() }],
    });

    return successResponse(res, 201, 'Settlement created', { settlement });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Advance settlement status ─────────────────────────────────────────
// Valid transitions: pending→processing, processing→generated, generated→paid, any→failed
exports.updateSettlementStatus = async (req, res, next) => {
  try {
    const { status, transactionRef, paymentMethod, failureReason, notes } = req.body;

    const validStatuses = ['processing', 'generated', 'paid', 'failed'];
    if (!validStatuses.includes(status)) return errorResponse(res, 400, 'Invalid status');

    const settlement = await Settlement.findById(req.params.id).populate('restaurant', 'name owner');
    if (!settlement) return errorResponse(res, 404, 'Settlement not found');
    if (settlement.status === 'paid') return errorResponse(res, 400, 'Settlement is already paid');

    const previousStatus = settlement.status;
    settlement.addHistory(status, req.user._id, notes);
    settlement.processedBy = req.user._id;

    if (status === 'processing') {
      // Mark commissions and invoices as 'included'
      await Commission.updateMany(
        { _id: { $in: settlement.commissions } },
        { status: 'included', settlement: settlement._id }
      );
      await Invoice.updateMany(
        { _id: { $in: settlement.invoices } },
        { settlementStatus: 'included', settlement: settlement._id }
      );
    }

    if (status === 'paid') {
      if (!transactionRef) return errorResponse(res, 400, 'transactionRef is required when marking as paid');
      settlement.transactionRef = transactionRef;
      settlement.paymentMethod  = paymentMethod;
      settlement.paidAt         = new Date();

      // Finalize commissions and invoices
      await Commission.updateMany(
        { _id: { $in: settlement.commissions } },
        { status: 'settled', settledAt: new Date() }
      );
      await Invoice.updateMany(
        { _id: { $in: settlement.invoices } },
        { settlementStatus: 'settled' }
      );

      // Notify restaurant owner
      await Notification.create({
        recipient: settlement.restaurant.owner,
        title:     'Settlement Completed',
        body:      `Your settlement of ₹${settlement.ownerReceivable} has been transferred`,
        type:      'settlement_completed',
        data:      { settlementId: settlement._id, amount: settlement.ownerReceivable },
        channel:   'in-app',
      });
    }

    if (status === 'failed') {
      settlement.failureReason = failureReason;

      // Revert commissions and invoices back to pending
      await Commission.updateMany(
        { _id: { $in: settlement.commissions } },
        { status: 'pending', $unset: { settlement: '' } }
      );
      await Invoice.updateMany(
        { _id: { $in: settlement.invoices } },
        { settlementStatus: 'pending', $unset: { settlement: '' } }
      );

      // Notify owner and admin
      const adminUsers = await require('../models/User').find({ role: 'admin' }).select('_id');
      const notifs = [
        {
          recipient: settlement.restaurant.owner,
          title:     'Settlement Failed',
          body:      `Settlement payment failed: ${failureReason}. Admin has been notified.`,
          type:      'settlement_failed',
          data:      { settlementId: settlement._id },
          channel:   'in-app',
        },
        ...adminUsers.map((a) => ({
          recipient: a._id,
          title:     'Settlement Failed',
          body:      `Settlement for ${settlement.restaurant.name} failed: ${failureReason}`,
          type:      'settlement_failed',
          data:      { settlementId: settlement._id },
          channel:   'in-app',
        })),
      ];
      await Notification.insertMany(notifs);
    }

    await settlement.save();
    return successResponse(res, 200, `Settlement ${status}`, { settlement });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: List all settlements ──────────────────────────────────────────────
exports.getAllSettlements = async (req, res, next) => {
  try {
    const { status, restaurantId, from, to, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (restaurantId) filter.restaurant = restaurantId;
    if (from || to) {
      filter.periodFrom = {};
      if (from) filter.periodFrom.$gte = new Date(from);
      if (to)   filter.periodFrom.$lte = new Date(to);
    }

    const total = await Settlement.countDocuments(filter);
    const settlements = await Settlement.find(filter)
      .populate('restaurant',  'name')
      .populate('processedBy', 'name')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return successResponse(res, 200, 'Settlements fetched', {
      settlements,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Owner: Their restaurant's settlements ────────────────────────────────────
exports.getMySettlements = async (req, res, next) => {
  try {
    const { restaurantId, page = 1, limit = 20 } = req.query;
    if (!(await Restaurant.findOne({ _id: restaurantId, owner: req.user._id }))) {
      return errorResponse(res, 403, 'Access denied');
    }

    const total = await Settlement.countDocuments({ restaurant: restaurantId });
    const settlements = await Settlement.find({ restaurant: restaurantId })
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return successResponse(res, 200, 'Settlements fetched', {
      settlements,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Admin / Owner: Get single settlement with full report ───────────────────
exports.getSettlement = async (req, res, next) => {
  try {
    const settlement = await Settlement.findById(req.params.id)
      .populate('restaurant',  'name commission settlementCycle')
      .populate('processedBy', 'name')
      .populate({
        path:     'commissions',
        populate: { path: 'invoice', select: 'invoiceId grossAmount discountBreakup netPaid commissionAmount restaurantReceivable paidAt' },
      });

    if (!settlement) return errorResponse(res, 404, 'Settlement not found');

    // Owner can only see their own settlement
    if (req.user.role === 'owner') {
      const owned = await Restaurant.findOne({ _id: settlement.restaurant._id, owner: req.user._id });
      if (!owned) return errorResponse(res, 403, 'Access denied');
    }

    return successResponse(res, 200, 'Settlement fetched', { settlement });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Settlement summary report ────────────────────────────────────────
exports.getSettlementReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const match = { status: 'paid' };
    if (from || to) {
      match.paidAt = {};
      if (from) match.paidAt.$gte = new Date(from);
      if (to)   match.paidAt.$lte = new Date(to);
    }

    const report = await Settlement.aggregate([
      { $match: match },
      {
        $group: {
          _id:                   null,
          totalSettlements:      { $sum: 1 },
          totalGrossAmount:      { $sum: '$totalGrossAmount' },
          totalOwnerDiscount:    { $sum: '$totalOwnerDiscount' },
          totalPlatformDiscount: { $sum: '$totalPlatformDiscount' },
          totalCommission:       { $sum: '$totalCommission' },
          totalOwnerReceivable:  { $sum: '$ownerReceivable' },
        },
      },
    ]);

    const byStatus = await Settlement.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, totalOwnerReceivable: { $sum: '$ownerReceivable' } } },
    ]);

    return successResponse(res, 200, 'Settlement report', {
      summary: report[0] || {},
      byStatus,
    });
  } catch (err) {
    next(err);
  }
};
