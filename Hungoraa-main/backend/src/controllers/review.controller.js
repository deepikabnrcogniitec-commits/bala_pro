const Review = require('../models/Review');
const Booking = require('../models/Booking');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const addReview = async (req, res, next) => {
  try {
    const { bookingId, restaurantId, rating, comment, title, tags,
      foodRating, serviceRating, ambianceRating, subRatings: rawSubRatings } = req.body;

    // Accept both flat fields (mobile) and nested subRatings (web)
    const subRatings = rawSubRatings || {
      food: foodRating,
      service: serviceRating,
      ambiance: ambianceRating,
    };

    // Verify booking belongs to customer and is completed
    const booking = await Booking.findOne({ _id: bookingId, customer: req.user._id, status: { $in: ['completed', 'seated'] } });
    if (!booking) return errorResponse(res, 400, 'You can only review after a completed booking');
    if (booking.hasReview) return errorResponse(res, 400, 'You have already reviewed this booking');

    const images = req.files?.map((f) => ({ url: f.path, publicId: f.filename })) || [];

    const review = await Review.create({
      customer: req.user._id,
      restaurant: restaurantId || booking.restaurant,
      booking: bookingId,
      rating,
      comment,
      title,
      subRatings,
      tags,
      images,
      isVerified: true,
    });

    booking.hasReview = true;
    booking.review = review._id;
    await booking.save();

    return successResponse(res, 201, 'Review submitted', { review });
  } catch (error) {
    next(error);
  }
};

const getRestaurantReviews = async (req, res, next) => {
  try {
    const { id: restaurantId } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;

    const sortMap = { newest: { createdAt: -1 }, highest: { rating: -1 }, lowest: { rating: 1 } };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
      Review.find({ restaurant: restaurantId, isPublished: true })
        .populate('customer', 'name avatar')
        .sort(sortMap[sort] || sortMap.newest)
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments({ restaurant: restaurantId, isPublished: true }),
    ]);

    const ratingStats = await Review.aggregate([
      { $match: { restaurant: require('mongoose').Types.ObjectId.createFromHexString(restaurantId), isPublished: true } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          r1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          r2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          r3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          r4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          r5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          avgFood: { $avg: '$subRatings.food' },
          avgService: { $avg: '$subRatings.service' },
          avgAmbiance: { $avg: '$subRatings.ambiance' },
        },
      },
    ]);

    const raw = ratingStats[0];
    const stats = raw ? {
      averageRating: Math.round((raw.averageRating || 0) * 10) / 10,
      totalReviews: raw.totalReviews || 0,
      ratingBreakdown: { 1: raw.r1, 2: raw.r2, 3: raw.r3, 4: raw.r4, 5: raw.r5 },
      avgFood: Math.round((raw.avgFood || 0) * 10) / 10,
      avgService: Math.round((raw.avgService || 0) * 10) / 10,
      avgAmbiance: Math.round((raw.avgAmbiance || 0) * 10) / 10,
    } : {};

    return paginatedResponse(res, { reviews, stats }, page, limit, total);
  } catch (error) {
    next(error);
  }
};

const getMyReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
      Review.find({ customer: req.user._id })
        .populate('restaurant', 'name images address')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments({ customer: req.user._id }),
    ]);

    return paginatedResponse(res, { reviews }, page, limit, total);
  } catch (error) {
    next(error);
  }
};

const ownerReply = async (req, res, next) => {
  try {
    const { comment, text } = req.body;
    const replyText = comment || text;
    if (!replyText) return errorResponse(res, 400, 'Reply text is required');

    const review = await Review.findById(req.params.id).populate('restaurant');
    if (!review) return errorResponse(res, 404, 'Review not found');
    if (review.restaurant.owner.toString() !== req.user._id.toString())
      return errorResponse(res, 403, 'Access denied');

    review.ownerReply = { text: replyText, repliedAt: new Date(), repliedBy: req.user._id };
    await review.save();
    return successResponse(res, 200, 'Reply posted', { review });
  } catch (error) {
    next(error);
  }
};

module.exports = { addReview, getRestaurantReviews, getMyReviews, ownerReply };
