const Commission = require('../models/Commission');
const Restaurant = require('../models/Restaurant');
const { successResponse, errorResponse } = require('../utils/response');

const INVOICE_SELECT = 'invoiceId grossAmount discountBreakup netPaid commissionBase commissionAmount restaurantReceivable paidAt paymentMethod settlementStatus';
const BOOKING_SELECT = 'bookingId date time guests bookingSource';

// ─── Admin: All commissions with formula breakdown ─────────────────────────────
exports.getAllCommissions = async (req, res) => {
  try {
    const { status, restaurantId, from, to, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status)       filter.status = status;
    if (restaurantId) filter.restaurant = restaurantId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const [commissions, total, summary] = await Promise.all([
      Commission.find(filter)
        .populate('restaurant', 'name commission commissionType')
        .populate('booking',    BOOKING_SELECT)
        .populate('invoice',    INVOICE_SELECT)
        .sort('-createdAt')
        .skip((page - 1) * Number(limit))
        .limit(Number(limit)),

      Commission.countDocuments(filter),

      Commission.aggregate([
        { $match: filter },
        {
          $group: {
            _id:                   '$status',
            count:                 { $sum: 1 },
            totalGross:            { $sum: '$grossAmount' },
            totalOwnerDiscount:    { $sum: '$ownerDiscount' },
            totalPlatformDiscount: { $sum: '$platformDiscount' },
            totalCommissionBase:   { $sum: '$commissionBase' },
            totalCommission:       { $sum: '$amount' },
          },
        },
      ]),
    ]);

    // Roll up all statuses into a single totals object
    const totals = summary.reduce(
      (acc, s) => {
        acc.totalGross            += s.totalGross;
        acc.totalOwnerDiscount    += s.totalOwnerDiscount;
        acc.totalPlatformDiscount += s.totalPlatformDiscount;
        acc.totalCommissionBase   += s.totalCommissionBase;
        acc.totalCommission       += s.totalCommission;
        acc.count                 += s.count;
        return acc;
      },
      { totalGross: 0, totalOwnerDiscount: 0, totalPlatformDiscount: 0, totalCommissionBase: 0, totalCommission: 0, count: 0 }
    );

    return successResponse(res, 200, 'Commissions fetched', {
      commissions,
      byStatus: summary,
      totals,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── Admin: Single commission with full formula audit ─────────────────────────
exports.getCommissionById = async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id)
      .populate('restaurant', 'name commission commissionType settlementCycle')
      .populate('booking',    BOOKING_SELECT)
      .populate('invoice',    INVOICE_SELECT)
      .populate('settlement', 'settlementId status paidAt ownerReceivable');

    if (!commission) return errorResponse(res, 404, 'Commission not found');

    // Attach a human-readable formula breakdown for the admin UI
    const formulaAudit = {
      grossAmount:           commission.grossAmount,
      minus_ownerDiscount:   commission.ownerDiscount,
      equals_commissionBase: commission.commissionBase,
      rate:                  `${commission.percentage}%`,
      commissionAmount:      commission.amount,
      restaurantReceivable:  commission.commissionBase - commission.amount,
      platformDiscount:      commission.platformDiscount,
    };

    return successResponse(res, 200, 'Commission fetched', { commission, formulaAudit });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── Admin: Per-restaurant commission summary ──────────────────────────────────
exports.getCommissionByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { from, to } = req.query;

    const restaurant = await Restaurant.findById(restaurantId).select('name commission commissionType settlementCycle');
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');

    const match = { restaurant: restaurant._id };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to)   match.createdAt.$lte = new Date(to);
    }

    const [byStatus, recent] = await Promise.all([
      Commission.aggregate([
        { $match: match },
        {
          $group: {
            _id:                   '$status',
            count:                 { $sum: 1 },
            totalGross:            { $sum: '$grossAmount' },
            totalOwnerDiscount:    { $sum: '$ownerDiscount' },
            totalPlatformDiscount: { $sum: '$platformDiscount' },
            totalCommissionBase:   { $sum: '$commissionBase' },
            totalCommission:       { $sum: '$amount' },
          },
        },
      ]),
      Commission.find(match)
        .populate('booking', BOOKING_SELECT)
        .populate('invoice', INVOICE_SELECT)
        .sort('-createdAt')
        .limit(10),
    ]);

    const pending  = byStatus.find((s) => s._id === 'pending')  || { totalCommission: 0, count: 0 };
    const included = byStatus.find((s) => s._id === 'included') || { totalCommission: 0, count: 0 };
    const settled  = byStatus.find((s) => s._id === 'settled')  || { totalCommission: 0, count: 0 };

    return successResponse(res, 200, 'Restaurant commission summary', {
      restaurant,
      pipeline: { pending, included, settled },
      recentCommissions: recent,
    });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── Owner: Their restaurant's commissions ─────────────────────────────────────
exports.getMyCommissions = async (req, res) => {
  try {
    const { restaurantId, status, from, to, page = 1, limit = 20 } = req.query;

    const restaurant = await Restaurant.findOne({ _id: restaurantId, owner: req.user._id });
    if (!restaurant) return errorResponse(res, 403, 'Access denied');

    const filter = { restaurant: restaurantId };
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }

    const [commissions, total, agg] = await Promise.all([
      Commission.find(filter)
        .populate('booking', BOOKING_SELECT)
        .populate('invoice', INVOICE_SELECT)
        .sort('-createdAt')
        .skip((page - 1) * Number(limit))
        .limit(Number(limit)),

      Commission.countDocuments(filter),

      Commission.aggregate([
        { $match: { restaurant: restaurant._id } },
        {
          $group: {
            _id:                 '$status',
            totalCommission:     { $sum: '$amount' },
            totalOwnerDiscount:  { $sum: '$ownerDiscount' },
            totalGross:          { $sum: '$grossAmount' },
            count:               { $sum: 1 },
          },
        },
      ]),
    ]);

    const pending  = agg.find((a) => a._id === 'pending')  || { totalCommission: 0, count: 0 };
    const included = agg.find((a) => a._id === 'included') || { totalCommission: 0, count: 0 };
    const settled  = agg.find((a) => a._id === 'settled')  || { totalCommission: 0, count: 0 };

    return successResponse(res, 200, 'Commissions fetched', {
      commissions,
      summary: { pending, included, settled },
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── Admin: Monthly/weekly commission trend ───────────────────────────────────
exports.getCommissionTrend = async (req, res) => {
  try {
    const { restaurantId, groupBy = 'week', from, to } = req.query;

    const match = {};
    if (restaurantId) match.restaurant = require('mongoose').Types.ObjectId(restaurantId);
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to)   match.createdAt.$lte = new Date(to);
    }

    const dateFormat = groupBy === 'month' ? '%Y-%m' : '%Y-%U'; // week = year-weekNum

    const trend = await Commission.aggregate([
      { $match: match },
      {
        $group: {
          _id:             { $dateToString: { format: dateFormat, date: '$createdAt' } },
          totalGross:      { $sum: '$grossAmount' },
          totalCommission: { $sum: '$amount' },
          count:           { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return successResponse(res, 200, 'Commission trend', { groupBy, trend });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};
