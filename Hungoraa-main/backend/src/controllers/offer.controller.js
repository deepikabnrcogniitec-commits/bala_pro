const Offer = require('../models/Offer');
const Restaurant = require('../models/Restaurant');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/response');
const { deleteImage } = require('../config/upload');

const verifyOwner = async (restaurantId, userId) =>
  !!(await Restaurant.findOne({ _id: restaurantId, owner: userId }));

// Who pays for the discount is a platform business decision: only admin may
// set it. Owners always create restaurant-funded offers.
// Returns { fundedBy, fundingBreakup } or { error }.
function resolveFunding(fundedBy = 'restaurant', breakup = {}) {
  const single = {
    restaurant: { restaurantPercent: 100, platformPercent: 0, bankPercent: 0 },
    platform:   { restaurantPercent: 0, platformPercent: 100, bankPercent: 0 },
    bank:       { restaurantPercent: 0, platformPercent: 0, bankPercent: 100 },
  };
  if (single[fundedBy]) return { fundedBy, fundingBreakup: single[fundedBy] };
  if (fundedBy !== 'combined') return { error: 'Invalid fundedBy value' };

  const fundingBreakup = {
    restaurantPercent: Number(breakup?.restaurantPercent) || 0,
    platformPercent:   Number(breakup?.platformPercent) || 0,
    bankPercent:       Number(breakup?.bankPercent) || 0,
  };
  const parts = Object.values(fundingBreakup);
  if (parts.some((p) => p < 0)) return { error: 'Funding percentages cannot be negative' };
  if (Math.round(parts.reduce((s, p) => s + p, 0)) !== 100) {
    return { error: 'fundingBreakup percentages must sum to 100' };
  }
  return { fundedBy, fundingBreakup };
}

// Fields an owner may never set directly on an offer.
const OWNER_LOCKED_FIELDS = [
  'fundedBy', 'fundingBreakup', 'approvalStatus', 'approvalHistory',
  'approvedBy', 'approvedAt', 'rejectionReason', 'usedCount', 'usedBy', 'createdBy', 'restaurant',
];

// ─── Customer / Public: List active approved offers ───────────────────────────
exports.getAllOffers = async (req, res, next) => {
  try {
    const { city, type, page = 1, limit = 20 } = req.query;
    const now = new Date();
    const todayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];

    const query = {
      isActive: true,
      approvalStatus: 'approved',
      validFrom: { $lte: now },
      validTo: { $gte: now },
    };
    if (type) query.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [offers, total] = await Promise.all([
      Offer.find(query)
        .populate({
          path: 'restaurant',
          select: 'name slug logo images address averageRating',
          match: city ? { 'address.city': { $regex: city, $options: 'i' } } : {},
        })
        // Featured offers surface first on the app home banner
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Offer.countDocuments(query),
    ]);

    // Drop offers whose restaurant was filtered out by the city match, and
    // day-scoped offers (e.g. weekend-only) that don't apply today.
    const visible = offers.filter(
      (o) => o.restaurant !== null
        && (!o.validDays?.length || o.validDays.includes(todayName)),
    );

    return successResponse(res, 200, 'Offers fetched', {
      offers: visible,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: list every offer (any status) for the management console ──────────
exports.adminListOffers = async (req, res, next) => {
  try {
    const {
      restaurantId, approvalStatus, isActive, search, page = 1, limit = 50,
    } = req.query;

    const query = {};
    if (restaurantId) query.restaurant = restaurantId;
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (isActive === 'true' || isActive === 'false') query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [offers, total] = await Promise.all([
      Offer.find(query)
        .populate('restaurant', 'name slug address')
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Offer.countDocuments(query),
    ]);

    return successResponse(res, 200, 'Offers fetched', {
      offers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Public / Owner: Offers for a restaurant ─────────────────────────────────
exports.getRestaurantOffers = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const isOwnerOrAdmin = ['owner', 'admin'].includes(req.user?.role);
    const query = { restaurant: restaurantId };
    if (!isOwnerOrAdmin) {
      query.isActive = true;
      query.approvalStatus = 'approved';
    }

    const offers = await Offer.find(query).sort({ createdAt: -1 });
    return successResponse(res, 200, 'Offers fetched', { offers });
  } catch (err) {
    next(err);
  }
};

// ─── Customer: Validate coupon + calculate discount breakdown ─────────────────
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, restaurantId, amount, guests } = req.body;

    const offer = await Offer.findOne({ code: code.toUpperCase(), restaurant: restaurantId });
    if (!offer) return errorResponse(res, 404, 'Invalid coupon code');

    const validity = offer.isValid(req.user._id, amount, guests);
    if (!validity.valid) return errorResponse(res, 400, validity.reason);

    const discountResult = offer.calculateDiscount(amount);

    return successResponse(res, 200, 'Coupon valid', {
      offer: {
        _id: offer._id,
        title: offer.title,
        type: offer.type,
        discountValue: offer.discountValue,
        fundedBy: offer.fundedBy,
      },
      discountBreakup: {
        restaurantFunded: discountResult.restaurantFunded,
        platformFunded:   discountResult.platformFunded,
        bankFunded:       discountResult.bankFunded,
        total:            discountResult.totalDiscount,
      },
      finalAmount: amount - discountResult.totalDiscount,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Owner: Create offer ──────────────────────────────────────────────────────
exports.createOffer = async (req, res, next) => {
  try {
    const { restaurantId, fundedBy, fundingBreakup, approvalRequired, ...rest } = req.body;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !(await verifyOwner(restaurantId, req.user._id))) {
      return errorResponse(res, 403, 'Access denied');
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');

    // Owners can only create restaurant-funded offers; admin picks the funder.
    const funding = isAdmin ? resolveFunding(fundedBy, fundingBreakup) : resolveFunding('restaurant');
    if (funding.error) return errorResponse(res, 400, funding.error);
    for (const f of OWNER_LOCKED_FIELDS) delete rest[f];

    // Determine if approval is required. Admin-created offers go live directly.
    const needsApproval = isAdmin
      ? false
      : (approvalRequired ?? restaurant.discountPolicy?.requiresApproval ?? false);
    const autoApproveBelow = restaurant.discountPolicy?.autoApproveBelow ?? 0;
    const discountValue = parseFloat(rest.discountValue || 0);

    let approvalStatus = 'approved';
    if (needsApproval && discountValue > autoApproveBelow) {
      approvalStatus = 'pending_approval';
    }

    const offer = await Offer.create({
      ...rest,
      restaurant: restaurantId,
      createdBy: req.user._id,
      fundedBy: funding.fundedBy,
      fundingBreakup: funding.fundingBreakup,
      approvalRequired: needsApproval,
      approvalStatus,
    });

    // Notify admin if pending approval
    if (approvalStatus === 'pending_approval') {
      const adminUsers = await require('../models/User').find({ role: 'admin' });
      const notifs = adminUsers.map((admin) => ({
        recipient: admin._id,
        title: 'Offer Pending Approval',
        body: `"${offer.title}" from ${restaurant.name} requires your approval`,
        type: 'system',
        data: { offerId: offer._id, restaurantId },
        channel: 'in-app',
      }));
      if (notifs.length) await Notification.insertMany(notifs);
    }

    return successResponse(res, 201, 'Offer created', { offer });
  } catch (err) {
    next(err);
  }
};

// ─── Owner / Admin: Upload an offer banner image ─────────────────────────────
// Returns the hosted URL + Cloudinary publicId; the client then sends these
// back inside the normal JSON offer payload as `image: { url, publicId }`.
exports.uploadOfferImage = async (req, res, next) => {
  try {
    if (!req.file) return errorResponse(res, 400, 'No image file received');
    return successResponse(res, 200, 'Image uploaded', {
      url: req.file.path,
      publicId: req.file.filename,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Owner / Admin: Update offer ─────────────────────────────────────────────
exports.updateOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('restaurant');
    if (!offer) return errorResponse(res, 404, 'Offer not found');
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && offer.restaurant.owner.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Access denied');
    }
    // Editing an approved owner offer resets it to draft until re-submitted.
    // Admin edits stay live.
    const updates = { ...req.body };
    delete updates.restaurantId;

    if (isAdmin) {
      if (updates.fundedBy !== undefined || updates.fundingBreakup !== undefined) {
        const funding = resolveFunding(
          updates.fundedBy ?? offer.fundedBy,
          updates.fundingBreakup ?? offer.fundingBreakup,
        );
        if (funding.error) return errorResponse(res, 400, funding.error);
        updates.fundedBy = funding.fundedBy;
        updates.fundingBreakup = funding.fundingBreakup;
      }
    } else {
      for (const f of OWNER_LOCKED_FIELDS) delete updates[f];
    }

    // Banner image changed or cleared — drop the old Cloudinary asset.
    if (Object.prototype.hasOwnProperty.call(req.body, 'image')) {
      const oldPublicId = offer.image?.publicId;
      const newPublicId = req.body.image?.publicId;
      if (oldPublicId && oldPublicId !== newPublicId) {
        deleteImage(oldPublicId).catch(() => {});
      }
    }
    if (!isAdmin && offer.approvalStatus === 'approved' && offer.approvalRequired) {
      updates.approvalStatus = 'draft';
    }

    const updated = await Offer.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    return successResponse(res, 200, 'Offer updated', { offer: updated });
  } catch (err) {
    next(err);
  }
};

// ─── Owner: Submit offer for admin approval ───────────────────────────────────
exports.submitForApproval = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('restaurant');
    if (!offer) return errorResponse(res, 404, 'Offer not found');
    if (offer.restaurant.owner.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'Access denied');
    }
    if (!['draft', 'rejected'].includes(offer.approvalStatus)) {
      return errorResponse(res, 400, `Cannot submit offer with status "${offer.approvalStatus}"`);
    }

    offer.approvalStatus = 'pending_approval';
    offer.approvalHistory.push({ status: 'pending_approval', timestamp: new Date() });
    await offer.save();

    // Notify admins
    const adminUsers = await require('../models/User').find({ role: 'admin' });
    const notifs = adminUsers.map((a) => ({
      recipient: a._id,
      title: 'Offer Pending Approval',
      body: `"${offer.title}" from ${offer.restaurant.name} needs review`,
      type: 'system',
      data: { offerId: offer._id },
      channel: 'in-app',
    }));
    if (notifs.length) await Notification.insertMany(notifs);

    return successResponse(res, 200, 'Offer submitted for approval', { offer });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Approve offer ─────────────────────────────────────────────────────
exports.approveOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('restaurant');
    if (!offer) return errorResponse(res, 404, 'Offer not found');
    if (offer.approvalStatus !== 'pending_approval') {
      return errorResponse(res, 400, 'Offer is not pending approval');
    }

    offer.approvalStatus = 'approved';
    offer.approvedBy = req.user._id;
    offer.approvedAt = new Date();
    offer.approvalHistory.push({ status: 'approved', reviewedBy: req.user._id, timestamp: new Date() });
    await offer.save();

    // Notify restaurant owner
    await Notification.create({
      recipient: offer.restaurant.owner,
      title: 'Offer Approved',
      body: `Your offer "${offer.title}" has been approved and is now live`,
      type: 'offer_approved',
      data: { offerId: offer._id },
      channel: 'in-app',
    });

    return successResponse(res, 200, 'Offer approved', { offer });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Reject offer ──────────────────────────────────────────────────────
exports.rejectOffer = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return errorResponse(res, 400, 'Rejection reason is required');

    const offer = await Offer.findById(req.params.id).populate('restaurant');
    if (!offer) return errorResponse(res, 404, 'Offer not found');

    offer.approvalStatus = 'rejected';
    offer.rejectionReason = reason;
    offer.approvalHistory.push({ status: 'rejected', reviewedBy: req.user._id, reason, timestamp: new Date() });
    await offer.save();

    await Notification.create({
      recipient: offer.restaurant.owner,
      title: 'Offer Rejected',
      body: `Your offer "${offer.title}" was rejected: ${reason}`,
      type: 'offer_rejected',
      data: { offerId: offer._id, reason },
      channel: 'in-app',
    });

    return successResponse(res, 200, 'Offer rejected', { offer });
  } catch (err) {
    next(err);
  }
};

// ─── Owner / Admin: Offer usage analytics ────────────────────────────────────
exports.getOfferUsage = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('restaurant', 'name owner');
    if (!offer) return errorResponse(res, 404, 'Offer not found');

    const isAdmin = req.user.role === 'admin';
    const isOwner = offer.restaurant.owner.toString() === req.user._id.toString();
    if (!isAdmin && !isOwner) return errorResponse(res, 403, 'Access denied');

    const DiscountLedger = require('../models/DiscountLedger');
    const ledger = await DiscountLedger.find({ offer: offer._id, status: 'applied' });

    const totalDiscount = ledger.reduce((s, l) => s + l.totalDiscount, 0);
    const restaurantFunded = ledger.reduce((s, l) => s + l.restaurantFunded, 0);
    const platformFunded   = ledger.reduce((s, l) => s + l.platformFunded, 0);
    const bankFunded       = ledger.reduce((s, l) => s + l.bankFunded, 0);

    return successResponse(res, 200, 'Offer usage', {
      offer: { title: offer.title, code: offer.code, fundedBy: offer.fundedBy },
      usedCount:     offer.usedCount,
      remaining:     offer.totalUsageLimit ? offer.totalUsageLimit - offer.usedCount : null,
      totalDiscount,
      funding: { restaurantFunded, platformFunded, bankFunded },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Owner / Admin: Delete offer ─────────────────────────────────────────────
exports.deleteOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('restaurant');
    if (!offer) return errorResponse(res, 404, 'Offer not found');
    if (offer.restaurant.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 403, 'Access denied');
    }
    if (offer.image?.publicId) deleteImage(offer.image.publicId).catch(() => {});
    await offer.deleteOne();
    return successResponse(res, 200, 'Offer deleted');
  } catch (err) {
    next(err);
  }
};
