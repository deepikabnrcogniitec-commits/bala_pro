const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const Branch = require('../models/Branch');
const User = require('../models/User');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { deleteImage } = require('../config/upload');

const PRICE_RANGE_MAP = { '1': '$', '2': '$$', '3': '$$$', '4': '$$$$' };

const parseFormData = (body) => {
  const {
    name, description, priceRange, city, address: street,
    phone, email, website, operatingHours: ohJson,
    minBookingGuests, maxBookingGuests, maxAdvanceBookingDays, bookingDuration,
    cuisine, facilities, latitude, longitude,
  } = body;

  const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

  let operatingHours = [];
  if (ohJson) {
    try {
      const ohObj = JSON.parse(ohJson);
      operatingHours = Object.entries(ohObj).map(([day, h]) => ({
        day,
        isOpen: h.isOpen === true || h.isOpen === 'true',
        slots: (h.isOpen === true || h.isOpen === 'true') ? [{ open: h.openTime, close: h.closeTime }] : [],
      }));
    } catch {}
  }

  const result = {
    name,
    description,
    cuisine: toArray(cuisine),
    amenities: toArray(facilities),
    priceRange: PRICE_RANGE_MAP[String(priceRange)] || '$$',
    address: { street, city, country: 'India' },
    contact: { phone, email, website },
    operatingHours,
    bookingSettings: {
      maxGuestsPerBooking: parseInt(maxBookingGuests) || 20,
      advanceBookingDays: parseInt(maxAdvanceBookingDays) || 30,
    },
  };

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (!isNaN(lat) && !isNaN(lng)) {
    result.location = { type: 'Point', coordinates: [lng, lat] };
  }

  return result;
};

// ─── Owner: Create Restaurant ─────────────────────────────────────────────────
const createRestaurant = async (req, res, next) => {
  try {
    const data = { ...parseFormData(req.body), owner: req.user._id, status: 'approved' };

    // Handle uploaded images
    if (req.files?.images) {
      data.images = req.files.images.map((f, i) => ({
        url: f.path,
        publicId: f.filename,
        isPrimary: i === 0,
      }));
    }
    if (req.files?.logo?.[0]) {
      data.logo = { url: req.files.logo[0].path, publicId: req.files.logo[0].filename };
    }

    const restaurant = await Restaurant.create(data);

    // Auto-create main branch
    await Branch.create({
      restaurant: restaurant._id,
      name: `${restaurant.name} - Main Branch`,
      address: restaurant.address,
      location: restaurant.location,
      contact: restaurant.contact,
      isMainBranch: true,
    });

    // Link to owner
    await User.findByIdAndUpdate(req.user._id, { $push: { restaurantIds: restaurant._id } });

    return successResponse(res, 201, 'Restaurant created successfully. Pending admin approval.', { restaurant });
  } catch (error) {
    next(error);
  }
};

// ─── Owner: Get My Restaurants ────────────────────────────────────────────────
const getMyRestaurants = async (req, res, next) => {
  try {
    const restaurants = await Restaurant.find({ owner: req.user._id })
      .select('+documents')
      .populate('subscriptionPlan', 'name features')
      .sort({ createdAt: -1 });
    return successResponse(res, 200, 'Restaurants fetched', { restaurants });
  } catch (error) {
    next(error);
  }
};

// ─── Owner: Update Restaurant ─────────────────────────────────────────────────
const updateRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ _id: req.params.id, owner: req.user._id });
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');

    const updates = { ...parseFormData(req.body) };
    // Auto-approve pending restaurants when owner edits them
    if (restaurant.status === 'pending') updates.status = 'approved';
    // Cover images: `existingImages` (JSON array of urls) lists the current
    // photos the owner kept; new uploads are appended. Without it, new
    // uploads replace the whole set (legacy behaviour).
    let kept = restaurant.images || [];
    if (req.body.existingImages !== undefined) {
      let keepUrls = [];
      try { keepUrls = JSON.parse(req.body.existingImages) || []; } catch {}
      kept = kept.filter((img) => keepUrls.includes(img.url));
    } else if (req.files?.images) {
      kept = [];
    }
    const removed = (restaurant.images || []).filter((img) => !kept.includes(img));
    for (const img of removed) {
      if (img.publicId) await deleteImage(img.publicId).catch(() => {});
    }
    const added = (req.files?.images || []).map((f) => ({ url: f.path, publicId: f.filename }));
    if (removed.length || added.length) {
      updates.images = [...kept.map((img) => ({ url: img.url, publicId: img.publicId })), ...added]
        .slice(0, 10)
        .map((img, i) => ({ ...img, isPrimary: i === 0 }));
    }

    if (req.files?.logo?.[0]) {
      if (restaurant.logo?.publicId) await deleteImage(restaurant.logo.publicId).catch(() => {});
      updates.logo = { url: req.files.logo[0].path, publicId: req.files.logo[0].filename };
    } else if (req.body.removeLogo === 'true') {
      if (restaurant.logo?.publicId) await deleteImage(restaurant.logo.publicId).catch(() => {});
      updates.logo = { url: undefined, publicId: undefined };
    }

    const updated = await Restaurant.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    return successResponse(res, 200, 'Restaurant updated', { restaurant: updated });
  } catch (error) {
    next(error);
  }
};

// ─── Public: Get All Restaurants ──────────────────────────────────────────────
const getAllRestaurants = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, city, cuisine, priceRange, rating, sortBy = 'relevance', search } = req.query;

    const query = { status: { $in: ['approved', 'active'] }, isActive: true };
    if (city) query['address.city'] = new RegExp(city, 'i');
    if (cuisine) query.cuisine = { $in: Array.isArray(cuisine) ? cuisine : [cuisine] };
    if (priceRange) query.priceRange = { $in: Array.isArray(priceRange) ? priceRange : [priceRange] };
    if (rating) query.averageRating = { $gte: parseFloat(rating) };
    if (search) query.$text = { $search: search };

    const sortOptions = {
      relevance: { isFeatured: -1, totalBookings: -1 },
      rating: { averageRating: -1 },
      costLow: { costForTwo: 1 },
      costHigh: { costForTwo: -1 },
      newest: { createdAt: -1 },
    };

    const skip = (page - 1) * limit;
    const [restaurants, total] = await Promise.all([
      Restaurant.find(query).sort(sortOptions[sortBy] || sortOptions.relevance).skip(skip).limit(parseInt(limit)).select('-owner'),
      Restaurant.countDocuments(query),
    ]);

    return paginatedResponse(res, { restaurants }, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// ─── Public: Get Restaurant by ID (or slug) ──────────────────────────────────
// Accepts a Mongo ObjectId or a slug. A malformed value returns a clean 404
// instead of a Mongoose CastError → 400.
const getRestaurantById = async (req, res, next) => {
  try {
    const key = String(req.params.id || '').trim();
    if (!key) return errorResponse(res, 404, 'Restaurant not found');

    const query = mongoose.isValidObjectId(key) ? { _id: key } : { slug: key };
    const restaurant = await Restaurant.findOne(query).populate('owner', 'name email');
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');
    return successResponse(res, 200, 'Restaurant fetched', { restaurant });
  } catch (error) {
    next(error);
  }
};

// ─── Public: Nearby Restaurants ───────────────────────────────────────────────
const getNearbyRestaurants = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10, limit = 20 } = req.query;
    if (!lat || !lng) return errorResponse(res, 400, 'lat and lng are required');

    const restaurants = await Restaurant.find({
      status: 'approved',
      isActive: true,
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseFloat(radius) * 1000,
        },
      },
    }).limit(parseInt(limit));

    return successResponse(res, 200, 'Nearby restaurants fetched', { restaurants });
  } catch (error) {
    next(error);
  }
};

// ─── Public: Cities ──────────────────────────────────────────────────────────
const getRestaurantCities = async (req, res, next) => {
  try {
    const cities = await Restaurant.distinct('address.city', {
      status: { $in: ['approved', 'active'] },
      isActive: true,
    });
    return successResponse(res, 200, 'Cities fetched', {
      cities: cities.filter(Boolean).sort(),
    });
  } catch (error) {
    next(error);
  }
};

// ─── Public: Featured & Trending ─────────────────────────────────────────────
const getFeaturedRestaurants = async (req, res, next) => {
  try {
    const restaurants = await Restaurant.find({ status: { $in: ['approved', 'active'] }, isActive: true, isFeatured: true })
      .limit(10).sort({ totalBookings: -1 });
    return successResponse(res, 200, 'Featured restaurants', { restaurants });
  } catch (error) {
    next(error);
  }
};

const getTrendingRestaurants = async (req, res, next) => {
  try {
    const { city } = req.query;
    const query = { status: { $in: ['approved', 'active'] }, isActive: true };
    if (city) query['address.city'] = new RegExp(city, 'i');
    const restaurants = await Restaurant.find(query).sort({ totalBookings: -1, averageRating: -1 }).limit(10);
    return successResponse(res, 200, 'Trending restaurants', { restaurants });
  } catch (error) {
    next(error);
  }
};

// ─── Public: Search ──────────────────────────────────────────────────────────
const searchRestaurants = async (req, res, next) => {
  try {
    const { q, cuisine, sortBy, page = 1, limit = 12 } = req.query;
    const query = { status: { $in: ['approved', 'active'] }, isActive: true };
    if (q) {
      query.$or = [
        { name: new RegExp(q, 'i') },
        { cuisine: new RegExp(q, 'i') },
        { tags: new RegExp(q, 'i') },
        { 'address.city': new RegExp(q, 'i') },
      ];
    }
    if (cuisine) query.cuisine = new RegExp(cuisine, 'i');

    const sortOptions = { rating: { averageRating: -1 }, costLow: { costForTwo: 1 }, costHigh: { costForTwo: -1 } };
    const sort = sortOptions[sortBy] || { totalBookings: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [restaurants, total] = await Promise.all([
      Restaurant.find(query).sort(sort).skip(skip).limit(parseInt(limit)),
      Restaurant.countDocuments(query),
    ]);

    return paginatedResponse(res, { restaurants }, page, limit, total, 'Search results');
  } catch (error) {
    next(error);
  }
};

// ─── Customer: Toggle Save ────────────────────────────────────────────────────
const toggleSaveRestaurant = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const restaurantId = req.params.id;
    const isSaved = user.savedRestaurants.includes(restaurantId);

    if (isSaved) {
      user.savedRestaurants = user.savedRestaurants.filter((id) => id.toString() !== restaurantId);
    } else {
      user.savedRestaurants.push(restaurantId);
    }
    await user.save();
    return successResponse(res, 200, isSaved ? 'Removed from saved' : 'Restaurant saved', { isSaved: !isSaved });
  } catch (error) {
    next(error);
  }
};

// ─── Owner: Get Dashboard Stats ───────────────────────────────────────────────
const getOwnerDashboard = async (req, res, next) => {
  try {
    const Booking = require('../models/Booking');
    const restaurants = await Restaurant.find({ owner: req.user._id });
    const restaurantIds = restaurants.map((r) => r._id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const [
      totalBookings,
      todayBookings,
      pendingBookings,
      revenueData,
    ] = await Promise.all([
      Booking.countDocuments({ restaurant: { $in: restaurantIds } }),
      Booking.countDocuments({ restaurant: { $in: restaurantIds }, date: todayStr }),
      Booking.countDocuments({ restaurant: { $in: restaurantIds }, status: 'pending' }),
      Booking.aggregate([
        { $match: { restaurant: { $in: restaurantIds }, status: { $in: ['completed', 'seated'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const totalRevenue = revenueData[0]?.total || 0;

    return successResponse(res, 200, 'Dashboard data', {
      restaurants: restaurants.length,
      totalBookings,
      todayBookings,
      pendingBookings,
      totalRevenue,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Owner: Analytics ────────────────────────────────────────────────────────
const getOwnerAnalytics = async (req, res, next) => {
  try {
    const Booking = require('../models/Booking');
    const { restaurantId, period = '30' } = req.query;

    const restaurant = await Restaurant.findOne({ _id: restaurantId, owner: req.user._id });
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');

    const days = parseInt(period);
    const from = new Date();
    from.setDate(from.getDate() - days);

    const bookingsByDay = await Booking.aggregate([
      {
        $match: {
          restaurant: restaurant._id,
          createdAt: { $gte: from },
          status: { $in: ['confirmed', 'completed', 'seated'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const guestsByTime = await Booking.aggregate([
      { $match: { restaurant: restaurant._id, status: { $in: ['completed', 'seated'] } } },
      { $group: { _id: '$time', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    return successResponse(res, 200, 'Analytics data', { bookingsByDay, guestsByTime });
  } catch (error) {
    next(error);
  }
};

const deleteRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');
    if (
      req.user.role !== 'admin' &&
      restaurant.owner.toString() !== req.user._id.toString()
    ) {
      return errorResponse(res, 403, 'Not authorized');
    }
    await restaurant.deleteOne();
    return successResponse(res, 200, 'Restaurant deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRestaurant,
  getMyRestaurants,
  updateRestaurant,
  deleteRestaurant,
  getAllRestaurants,
  getRestaurantById,
  getNearbyRestaurants,
  getFeaturedRestaurants,
  getTrendingRestaurants,
  getRestaurantCities,
  searchRestaurants,
  toggleSaveRestaurant,
  getOwnerDashboard,
  getOwnerAnalytics,
};
