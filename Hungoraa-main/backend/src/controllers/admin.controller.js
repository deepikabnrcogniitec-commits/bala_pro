const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const Wallet = require('../models/Wallet');
const Commission = require('../models/Commission');
const Settlement = require('../models/Settlement');
const Invoice = require('../models/Invoice');
const Offer = require('../models/Offer');
const DiscountLedger = require('../models/DiscountLedger');
const PlatformSettings = require('../models/PlatformSettings');
const billingService = require('../services/billing.service');
const { sendPushNotification, sendMulticastNotification } = require('../config/firebase');
const { successResponse, errorResponse } = require('../utils/response');

// Dashboard overview
exports.getDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers, newUsersToday,
      totalRestaurants, pendingApproval,
      totalBookings, todayBookings,
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: today } }),
      Restaurant.countDocuments(),
      Restaurant.countDocuments({ status: 'pending' }),
      Booking.countDocuments(),
      Booking.countDocuments({ createdAt: { $gte: today } }),
    ]);

    const revenueAgg = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, todayTotal: {
        $sum: { $cond: [{ $gte: ['$createdAt', today] }, '$amount', 0] }
      }}}
    ]);
    const revenue = revenueAgg[0] || { total: 0, todayTotal: 0 };

    // Last 14 days growth data
    const since14 = new Date();
    since14.setDate(since14.getDate() - 14);
    const [usersByDay, bookingsByDay] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: since14 }, role: 'customer' } },
        { $group: { _id: { $dateToString: { format: '%m/%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: since14 } } },
        { $group: { _id: { $dateToString: { format: '%m/%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    const userMap = Object.fromEntries(usersByDay.map((d) => [d._id, d.count]));
    const bookingMap = Object.fromEntries(bookingsByDay.map((d) => [d._id, d.count]));
    const growthData = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
      growthData.push({ date: key, users: userMap[key] || 0, bookings: bookingMap[key] || 0 });
    }

    // Pending restaurants
    const pendingRestaurants = await Restaurant.find({ status: 'pending' })
      .populate('owner', 'name email')
      .sort('-createdAt')
      .limit(5)
      .lean();

    successResponse(res, 200, 'Dashboard fetched', {
      totalUsers, newUsersToday,
      totalRestaurants, pendingApproval,
      totalBookings, todayBookings,
      totalRevenue: revenue.total,
      todayRevenue: revenue.todayTotal,
      growthData,
      pendingRestaurants: pendingRestaurants.map((r) => ({
        _id: r._id,
        name: r.name,
        city: r.address?.city,
        owner: r.owner?.name,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.getStats = async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(period));
    const prevSince = new Date();
    prevSince.setDate(prevSince.getDate() - parseInt(period) * 2);

    const [
      newUsers, prevUsers,
      newRestaurants, prevRestaurants,
      bookingAgg, prevBookingAgg,
      revenueAgg, prevRevenueAgg,
      growthRaw,
      cuisineAgg,
      cityAgg,
    ] = await Promise.all([
      User.countDocuments({ role: 'customer', createdAt: { $gte: since } }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: prevSince, $lt: since } }),
      Restaurant.countDocuments({ createdAt: { $gte: since } }),
      Restaurant.countDocuments({ createdAt: { $gte: prevSince, $lt: since } }),
      Booking.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: prevSince, $lt: since } } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: since } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: prevSince, $lt: since } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: {
          _id: { $dateToString: { format: '%m/%d', date: '$createdAt' } },
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        }},
        { $sort: { _id: 1 } },
      ]),
      Restaurant.aggregate([
        { $unwind: '$cuisine' },
        { $group: { _id: '$cuisine', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $lookup: { from: 'restaurants', localField: 'restaurant', foreignField: '_id', as: 'r' } },
        { $unwind: '$r' },
        { $group: { _id: '$r.address.city', bookings: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
        { $sort: { bookings: -1 } },
        { $limit: 8 },
      ]),
    ]);

    const totalBookings = bookingAgg[0]?.count || 0;
    const prevTotalBookings = prevBookingAgg[0]?.count || 0;
    const totalRevenue = revenueAgg[0]?.total || 0;
    const prevTotalRevenue = prevRevenueAgg[0]?.total || 0;

    const calcGrowth = (curr, prev) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

    // Build growthData array
    const bookingMap = Object.fromEntries(growthRaw.map((d) => [d._id, d]));
    const growthData = [];
    for (let i = parseInt(period) - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
      growthData.push({
        date: key,
        bookings: bookingMap[key]?.bookings || 0,
        revenue: bookingMap[key]?.revenue || 0,
        users: 0,
      });
    }

    const totalCuisineCount = cuisineAgg.reduce((s, c) => s + c.count, 0);

    successResponse(res, 200, 'Stats fetched', {
      newUsers,
      newRestaurants,
      totalBookings,
      totalRevenue,
      userGrowth: calcGrowth(newUsers, prevUsers),
      restaurantGrowth: calcGrowth(newRestaurants, prevRestaurants),
      bookingGrowth: calcGrowth(totalBookings, prevTotalBookings),
      revenueGrowth: calcGrowth(totalRevenue, prevTotalRevenue),
      growthData,
      cuisines: cuisineAgg.map((c) => ({
        name: c._id,
        value: totalCuisineCount ? Math.round((c.count / totalCuisineCount) * 100) : 0,
      })),
      topCities: cityAgg.map((c) => ({ city: c._id || 'Unknown', bookings: c.bookings, revenue: c.revenue })),
    });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// Users
exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role && role !== 'all') filter.role = role;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password -otp -refreshTokens')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    successResponse(res, 200, 'Users fetched', { users, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -otp -refreshTokens')
      .populate('wallet');
    if (!user) return errorResponse(res, 404, 'User not found');

    const bookingStats = await Booking.aggregate([
      { $match: { customer: user._id } },
      { $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        completedBookings: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelledBookings: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      }},
    ]);

    successResponse(res, 200, 'User fetched', {
      user: user.toSafeObject ? user.toSafeObject() : user,
      stats: bookingStats[0] || { totalBookings: 0, completedBookings: 0, cancelledBookings: 0 },
    });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return errorResponse(res, 404, 'User not found');
    user.isBlocked = !user.isBlocked;
    await user.save();
    successResponse(res, 200, `User ${user.isBlocked ? 'blocked' : 'unblocked'}`, { user: user.toSafeObject ? user.toSafeObject() : user });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return errorResponse(res, 404, 'User not found');
    successResponse(res, 200, 'User deleted');
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// Create restaurant + owner account (admin flow)
exports.createRestaurantWithOwner = async (req, res) => {
  try {
    const {
      // Owner details
      ownerName, ownerEmail, ownerPassword, ownerPhone,
      // Restaurant details
      name, city, state, address, cuisine, priceRange, phone, email, description,
      subscriptionPlan = 'basic', commission = 10,
      // KYC document numbers
      fssaiNumber, panNumber, aadharNumber,
    } = req.body;

    // Business docs are optional at onboarding — can be added later
    const files = req.files || {};
    const fssaiDoc = files.fssaiDoc?.[0];
    const panDoc = files.panDoc?.[0];
    const aadharDoc = files.aadharDoc?.[0];

    // Normalize email to match how login queries it
    const normalizedEmail = ownerEmail.toLowerCase().trim();

    // Check if owner already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return errorResponse(res, 400, 'Owner email already registered');

    // Create owner user
    const owner = await User.create({
      name: ownerName,
      email: normalizedEmail,
      password: ownerPassword,
      phone: ownerPhone || undefined,
      role: 'owner',
      isEmailVerified: true,
      isActive: true,
    });

    // Create wallet for owner
    const wallet = await Wallet.create({ user: owner._id });
    owner.wallet = wallet._id;
    await owner.save();

    const documents = {};
    if (fssaiNumber || fssaiDoc) {
      documents.fssai = { number: fssaiNumber, url: fssaiDoc?.path, publicId: fssaiDoc?.filename };
    }
    if (panNumber || panDoc) {
      documents.pan = { number: panNumber, url: panDoc?.path, publicId: panDoc?.filename };
    }
    if (aadharNumber || aadharDoc) {
      documents.aadhar = { number: aadharNumber, url: aadharDoc?.path, publicId: aadharDoc?.filename };
    }

    // Create restaurant
    const restaurant = await Restaurant.create({
      name,
      owner: owner._id,
      address: {
        city,
        state: state || '',
        street: address || '',
        country: 'India',
      },
      cuisine: Array.isArray(cuisine) ? cuisine : [cuisine].filter(Boolean),
      contact: { phone, email },
      description,
      priceRange: priceRange || '$$',
      subscriptionPlan,
      commission: Number(commission),
      status: 'active',
      isVerified: true,
      ...(Object.keys(documents).length ? { documents } : {}),
    });

    // Link restaurant to owner
    owner.restaurantIds = [restaurant._id];
    await owner.save();

    successResponse(res, 201, 'Restaurant and owner created successfully', {
      owner: {
        _id: owner._id,
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        role: owner.role,
      },
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        status: restaurant.status,
      },
    });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// Single restaurant, admin view — includes KYC documents (PAN/Aadhar/FSSAI),
// which are select:false everywhere else to keep them off public endpoints.
exports.getRestaurantByIdAdmin = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id)
      .select('+documents')
      .populate('owner', 'name email phone');
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');
    successResponse(res, 200, 'Restaurant fetched', { restaurant });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// Restaurants
exports.getAllRestaurantsAdmin = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'address.city': { $regex: search, $options: 'i' } },
    ];

    const total = await Restaurant.countDocuments(filter);
    const restaurants = await Restaurant.find(filter)
      .populate('owner', 'name email phone')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    successResponse(res, 200, 'Restaurants fetched', { restaurants, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.approveRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { status: 'active', isVerified: true },
      { new: true }
    ).populate('owner', 'name email fcmTokens');
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');

    if (restaurant.owner?.fcmTokens?.length > 0) {
      try {
        await sendPushNotification(restaurant.owner.fcmTokens[0], 'Restaurant Approved!',
          `Your restaurant "${restaurant.name}" is now live on Hungora.`);
      } catch {}
    }

    successResponse(res, 200, 'Restaurant approved', { restaurant });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.rejectRestaurant = async (req, res) => {
  try {
    const { reason } = req.body;
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: reason },
      { new: true }
    );
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');
    successResponse(res, 200, 'Restaurant rejected', { restaurant });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.updateCommission = async (req, res) => {
  try {
    const { commission } = req.body;
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { commission: Number(commission) },
      { new: true }
    );
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');
    successResponse(res, 200, 'Commission updated', { restaurant });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const { plan } = req.body;
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { subscriptionPlan: plan },
      { new: true }
    );
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');
    successResponse(res, 200, 'Subscription updated', { restaurant });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.toggleBlockRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');
    restaurant.status = restaurant.status === 'suspended' ? 'active' : 'suspended';
    await restaurant.save();
    successResponse(res, 200, `Restaurant ${restaurant.status}`, { restaurant });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return errorResponse(res, 400, 'Password must be at least 8 characters');
    }
    const user = await User.findById(req.params.id).select('+password');
    if (!user) return errorResponse(res, 404, 'User not found');

    user.password = newPassword;
    user.refreshTokens = [];
    await user.save();

    successResponse(res, 200, 'Password reset successfully. All sessions cleared.');
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');
    successResponse(res, 200, 'Restaurant deleted');
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.updateRestaurantAdmin = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');

    const { name, city, state, address, description, cuisine, priceRange, phone, email, status, commission, subscriptionPlan } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (cuisine) updates.cuisine = Array.isArray(cuisine) ? cuisine : [cuisine].filter(Boolean);
    if (priceRange) updates.priceRange = priceRange;
    if (status) updates.status = status;
    if (commission !== undefined) updates.commission = Number(commission);
    if (subscriptionPlan) updates.subscriptionPlan = subscriptionPlan;

    if (city || state || address) {
      updates.address = {
        ...restaurant.address.toObject?.() || restaurant.address,
        ...(city && { city }),
        ...(state !== undefined && { state }),
        ...(address !== undefined && { street: address }),
      };
    }
    if (phone || email) {
      updates.contact = {
        ...restaurant.contact.toObject?.() || restaurant.contact,
        ...(phone && { phone }),
        ...(email && { email }),
      };
    }

    const updated = await Restaurant.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate('owner', 'name email phone');
    successResponse(res, 200, 'Restaurant updated', { restaurant: updated });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// Bookings (admin view)
exports.getAllBookingsAdmin = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;

    const total = await Booking.countDocuments(filter);
    const bookings = await Booking.find(filter)
      .populate('customer', 'name email phone')
      .populate('restaurant', 'name address')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    successResponse(res, 200, 'Bookings fetched', { bookings, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// Reviews (admin view)
exports.getAllReviewsAdmin = async (req, res) => {
  try {
    const { rating, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (rating && rating !== 'all') filter.rating = parseInt(rating);

    const total = await Review.countDocuments(filter);
    const reviews = await Review.find(filter)
      .populate('customer', 'name')
      .populate('restaurant', 'name address')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    successResponse(res, 200, 'Reviews fetched', { reviews, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return errorResponse(res, 404, 'Review not found');
    successResponse(res, 200, 'Review deleted');
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// Payments
exports.getAllPayments = async (req, res) => {
  try {
    const { status, from, to, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate('customer', 'name')
      .populate('restaurant', 'name')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const summaryAgg = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        avgOrderValue: { $avg: '$amount' },
      }},
    ]);
    const summary = summaryAgg[0] || { totalRevenue: 0, totalTransactions: 0, avgOrderValue: 0 };

    successResponse(res, 200, 'Payments fetched', { payments, total, pages: Math.ceil(total / limit), summary });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// Bulk Notifications
exports.sendBulkNotification = async (req, res) => {
  try {
    const { title, body, target, channels = ['push'] } = req.body;

    let userFilter = { isActive: true, isBlocked: false };
    if (target === 'customers') userFilter.role = 'customer';
    if (target === 'owners') userFilter.role = 'owner';

    let sentCount = 0;

    if (channels.includes('push')) {
      const users = await User.find({ ...userFilter, fcmTokens: { $exists: true, $ne: [] } })
        .select('fcmTokens').lean();
      const tokens = users.flatMap((u) => u.fcmTokens || []).filter(Boolean);
      sentCount = tokens.length;
      if (tokens.length > 0) {
        try {
          await sendMulticastNotification(tokens, title, body);
        } catch {}
      }
    }

    successResponse(res, 200, 'Notifications sent', { count: sentCount });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

exports.getNotificationHistory = async (req, res) => {
  try {
    // Return empty history since bulk notifications are not stored per-user
    successResponse(res, 200, 'History fetched', { notifications: [] });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// Platform Settings — persisted singleton (models/PlatformSettings)
const cleanSettings = (doc) => {
  const o = doc.toObject();
  delete o._id; delete o.__v; delete o.key; delete o.createdAt; delete o.updatedAt;
  return o;
};

exports.getSettings = async (req, res) => {
  try {
    const doc = await PlatformSettings.getSingleton();
    successResponse(res, 200, 'Settings fetched', { settings: cleanSettings(doc) });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// Rewrite an upload URL so it points at the host that actually served the
// request — local-disk uploads get stored with whatever BACKEND_PUBLIC_URL was
// (often localhost), which a phone can't reach.
const absolutiseUrl = (u, req) => {
  if (!u) return u;
  const host = `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '');
  if (/^https?:\/\//i.test(u)) {
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(u)) {
      return host + u.replace(/^https?:\/\/[^/]+/i, '');
    }
    return u; // already an external absolute URL
  }
  return `${host}${u.startsWith('/') ? '' : '/'}${u}`; // relative path
};

exports.updateSettings = async (req, res) => {
  try {
    const doc = await PlatformSettings.getSingleton();
    for (const key of PlatformSettings.WRITABLE) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) doc[key] = req.body[key];
    }
    // Setting an image without a flag? Turn it on — that's the obvious intent.
    if (req.body.homeHeroImageUrl && req.body.homeHeroEnabled === undefined) {
      doc.homeHeroEnabled = true;
    }
    await doc.save();
    billingService.invalidate(); // pick up new fee/GST/hero values immediately
    successResponse(res, 200, 'Settings updated', { settings: cleanSettings(doc) });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// Generic image / video upload — returns the public URL for the caller to store in settings
exports.uploadAsset = async (req, res) => {
  try {
    if (!req.file) return errorResponse(res, 400, 'No file received');
    successResponse(res, 200, 'Uploaded', {
      url: absolutiseUrl(req.file.path, req),
      publicId: req.file.filename,
    });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// Public — the safe subset mobile clients can read without auth
exports.getPublicSettings = async (req, res) => {
  try {
    const doc = await PlatformSettings.getSingleton();
    const out = {};
    for (const k of PlatformSettings.PUBLIC) out[k] = doc[k];
    out.homeHeroImageUrl = absolutiseUrl(out.homeHeroImageUrl, req);
    out.homeHeroVideoUrl = absolutiseUrl(out.homeHeroVideoUrl, req);
    // landingHeroImageUrl is left as stored: the landing site is served from the
    // same origin and loads its own /uploads/… by path (absolutiseUrl would give
    // http:// behind nginx → mixed content on https).
    successResponse(res, 200, 'Public settings', { settings: out });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// ─── Admin: Commission Dashboard ───────────────────────────────────────────────
exports.getCommissionDashboard = async (req, res) => {
  try {
    const { restaurantId, status, from, to, page = 1, limit = 20 } = req.query;
    const match = {};
    if (restaurantId) match.restaurant = require('mongoose').Types.ObjectId(restaurantId);
    if (status) match.status = status;
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to)   match.createdAt.$lte = new Date(to);
    }

    const [summary, commissions, total] = await Promise.all([
      Commission.aggregate([
        { $match: match },
        {
          $group: {
            _id:                  null,
            totalGross:           { $sum: '$grossAmount' },
            totalOwnerDiscount:   { $sum: '$ownerDiscount' },
            totalPlatformDiscount:{ $sum: '$platformDiscount' },
            totalCommissionBase:  { $sum: '$commissionBase' },
            totalCommission:      { $sum: '$amount' },
            pending:  { $sum: { $cond: [{ $eq: ['$status', 'pending'] },  '$amount', 0] } },
            included: { $sum: { $cond: [{ $eq: ['$status', 'included'] }, '$amount', 0] } },
            settled:  { $sum: { $cond: [{ $eq: ['$status', 'settled'] },  '$amount', 0] } },
          },
        },
      ]),
      Commission.find(match)
        .populate('restaurant', 'name')
        .populate('invoice', 'invoiceId netPaid commissionAmount paidAt')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Commission.countDocuments(match),
    ]);

    successResponse(res, 200, 'Commission dashboard', {
      summary: summary[0] || {},
      commissions,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// ─── Admin: Settlement Dashboard ───────────────────────────────────────────────
exports.getSettlementDashboard = async (req, res) => {
  try {
    const [byStatus, recent] = await Promise.all([
      Settlement.aggregate([
        {
          $group: {
            _id:   '$status',
            count: { $sum: 1 },
            totalOwnerReceivable: { $sum: '$ownerReceivable' },
            totalCommission:      { $sum: '$totalCommission' },
          },
        },
      ]),
      Settlement.find()
        .populate('restaurant', 'name')
        .sort('-createdAt')
        .limit(10),
    ]);

    const pending    = byStatus.find((s) => s._id === 'pending')    || { count: 0, totalOwnerReceivable: 0 };
    const processing = byStatus.find((s) => s._id === 'processing') || { count: 0, totalOwnerReceivable: 0 };
    const generated  = byStatus.find((s) => s._id === 'generated')  || { count: 0, totalOwnerReceivable: 0 };
    const paid       = byStatus.find((s) => s._id === 'paid')       || { count: 0, totalOwnerReceivable: 0 };
    const failed     = byStatus.find((s) => s._id === 'failed')     || { count: 0, totalOwnerReceivable: 0 };

    successResponse(res, 200, 'Settlement dashboard', {
      pipeline: { pending, processing, generated, paid, failed },
      recentSettlements: recent,
    });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// ─── Admin: Offer Approval Queue ───────────────────────────────────────────────
exports.getPendingOffers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = { approvalStatus: 'pending_approval' };

    const total = await Offer.countDocuments(filter);
    const offers = await Offer.find(filter)
      .populate('restaurant', 'name address commission')
      .populate('createdBy', 'name email')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    successResponse(res, 200, 'Pending offers', {
      offers,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// ─── Admin: Discount Analytics ─────────────────────────────────────────────────
exports.getDiscountAnalytics = async (req, res) => {
  try {
    const { from, to } = req.query;
    const match = { status: 'applied' };
    if (from || to) {
      match.appliedAt = {};
      if (from) match.appliedAt.$gte = new Date(from);
      if (to)   match.appliedAt.$lte = new Date(to);
    }

    const [summary, byOffer, byRestaurant] = await Promise.all([
      DiscountLedger.aggregate([
        { $match: match },
        {
          $group: {
            _id:              null,
            totalApplications:   { $sum: 1 },
            totalDiscount:       { $sum: '$totalDiscount' },
            restaurantFunded:    { $sum: '$restaurantFunded' },
            platformFunded:      { $sum: '$platformFunded' },
            bankFunded:          { $sum: '$bankFunded' },
          },
        },
      ]),
      DiscountLedger.aggregate([
        { $match: match },
        { $group: { _id: '$offer', count: { $sum: 1 }, totalDiscount: { $sum: '$totalDiscount' }, platformCost: { $sum: '$platformFunded' } } },
        { $sort: { totalDiscount: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'offers', localField: '_id', foreignField: '_id', as: 'offer' } },
        { $unwind: '$offer' },
        { $project: { offerTitle: '$offer.title', offerCode: '$offer.code', fundedBy: '$offer.fundedBy', count: 1, totalDiscount: 1, platformCost: 1 } },
      ]),
      DiscountLedger.aggregate([
        { $match: match },
        { $group: { _id: '$restaurant', totalDiscount: { $sum: '$totalDiscount' }, restaurantBore: { $sum: '$restaurantFunded' }, platformBore: { $sum: '$platformFunded' } } },
        { $sort: { totalDiscount: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'restaurants', localField: '_id', foreignField: '_id', as: 'restaurant' } },
        { $unwind: '$restaurant' },
        { $project: { restaurantName: '$restaurant.name', totalDiscount: 1, restaurantBore: 1, platformBore: 1 } },
      ]),
    ]);

    successResponse(res, 200, 'Discount analytics', {
      summary: summary[0] || {},
      topOffers: byOffer,
      topRestaurants: byRestaurant,
    });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// ─── Admin: Revenue Analytics ──────────────────────────────────────────────────
exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { from, to, period = 30 } = req.query;
    const since = from ? new Date(from) : (() => { const d = new Date(); d.setDate(d.getDate() - parseInt(period)); return d; })();
    const until = to ? new Date(to) : new Date();

    const [invoiceSummary, settlementSummary, dailyRevenue] = await Promise.all([
      Invoice.aggregate([
        { $match: { paymentStatus: 'paid', paidAt: { $gte: since, $lte: until } } },
        {
          $group: {
            _id:                  null,
            gmv:                  { $sum: '$grossAmount' },           // gross merchandise value
            totalOwnerDiscount:   { $sum: '$discountBreakup.restaurantFunded' },
            totalPlatformDiscount:{ $sum: '$discountBreakup.platformFunded' },
            netCustomerPaid:      { $sum: '$netPaid' },
            totalCommission:      { $sum: '$commissionAmount' },
            totalRestaurantReceivable: { $sum: '$restaurantReceivable' },
            count:                { $sum: 1 },
          },
        },
      ]),
      Settlement.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: since, $lte: until } } },
        { $group: { _id: null, totalDisbursed: { $sum: '$ownerReceivable' }, count: { $sum: 1 } } },
      ]),
      Invoice.aggregate([
        { $match: { paymentStatus: 'paid', paidAt: { $gte: since, $lte: until } } },
        {
          $group: {
            _id:        { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
            gmv:        { $sum: '$grossAmount' },
            commission: { $sum: '$commissionAmount' },
            count:      { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const inv = invoiceSummary[0] || {};
    const set = settlementSummary[0] || {};

    successResponse(res, 200, 'Revenue analytics', {
      summary: {
        gmv:                    inv.gmv || 0,
        totalOwnerDiscount:     inv.totalOwnerDiscount || 0,
        totalPlatformDiscount:  inv.totalPlatformDiscount || 0,
        netCustomerPaid:        inv.netCustomerPaid || 0,
        commissionEarned:       inv.totalCommission || 0,
        ownerReceivableTotal:   inv.totalRestaurantReceivable || 0,
        totalDisbursed:         set.totalDisbursed || 0,
        pendingDisbursement:    (inv.totalRestaurantReceivable || 0) - (set.totalDisbursed || 0),
        totalInvoices:          inv.count || 0,
      },
      dailyRevenue,
    });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

// ─── Admin: Update restaurant commission + settlement + discount policy ────────
exports.updateRestaurantPolicy = async (req, res) => {
  try {
    const { commission, commissionType, settlementCycle, discountPolicy } = req.body;
    const updates = {};
    if (commission !== undefined)    updates.commission      = Number(commission);
    if (commissionType)              updates.commissionType  = commissionType;
    if (settlementCycle)             updates.settlementCycle = settlementCycle;
    if (discountPolicy)              updates.discountPolicy  = discountPolicy;

    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!restaurant) return errorResponse(res, 404, 'Restaurant not found');

    successResponse(res, 200, 'Restaurant policy updated', { restaurant });
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};
