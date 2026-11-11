const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendPushNotification, sendMulticastNotification } = require('../config/firebase');
const { successResponse, errorResponse } = require('../utils/response');

// ─── User: Get notifications (with type + read filter) ────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const { type, channel, isRead, page = 1, limit = 20 } = req.query;

    const filter = { recipient: req.user._id };
    if (type)    filter.type    = { $in: type.split(',') };
    if (channel) filter.channel = channel;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    return successResponse(res, 200, 'Notifications fetched', {
      notifications,
      unreadCount,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── User: Unread count (optionally grouped by type) ──────────────────────────
exports.getUnreadCount = async (req, res) => {
  try {
    const { grouped } = req.query;

    if (grouped === 'true') {
      const breakdown = await Notification.aggregate([
        { $match: { recipient: req.user._id, isRead: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]);

      const total = breakdown.reduce((sum, b) => sum + b.count, 0);
      const byType = Object.fromEntries(breakdown.map((b) => [b._id, b.count]));

      return successResponse(res, 200, 'Unread count', { total, byType });
    }

    const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    return successResponse(res, 200, 'Unread count', { count });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── User: Mark single notification as read ────────────────────────────────────
exports.markRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return errorResponse(res, 404, 'Notification not found');

    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    return successResponse(res, 200, 'Marked as read', { notification, unreadCount });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── User: Mark multiple notifications as read ─────────────────────────────────
exports.markMultipleRead = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 400, 'ids array is required');
    }

    await Notification.updateMany(
      { _id: { $in: ids }, recipient: req.user._id },
      { isRead: true, readAt: new Date() }
    );

    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    return successResponse(res, 200, 'Marked as read', { unreadCount });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── User: Mark all as read (optionally by type) ──────────────────────────────
exports.markAllRead = async (req, res) => {
  try {
    const { type } = req.body;
    const filter = { recipient: req.user._id, isRead: false };
    if (type) filter.type = type;

    await Notification.updateMany(filter, { isRead: true, readAt: new Date() });
    return successResponse(res, 200, 'All notifications marked as read');
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── User: Delete single notification ─────────────────────────────────────────
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });
    if (!notification) return errorResponse(res, 404, 'Notification not found');
    return successResponse(res, 200, 'Notification deleted');
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── User: Clear all read notifications ───────────────────────────────────────
exports.clearAll = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = { recipient: req.user._id, isRead: true };
    if (type) filter.type = type;

    const { deletedCount } = await Notification.deleteMany(filter);
    return successResponse(res, 200, 'Read notifications cleared', { deletedCount });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── Admin: Send notification to a specific user ───────────────────────────────
exports.sendToUser = async (req, res) => {
  try {
    const { userId, title, body, type = 'system', channel = 'in-app', data } = req.body;

    const user = await User.findById(userId);
    if (!user) return errorResponse(res, 404, 'User not found');

    const notification = await Notification.create({
      recipient: userId,
      title,
      body,
      type,
      channel,
      data,
    });

    // Also push via FCM if requested
    if (channel === 'push' && user.fcmTokens?.length > 0) {
      sendPushNotification(user.fcmTokens[0], title, body, data).catch(() => {});
    }

    return successResponse(res, 201, 'Notification sent', { notification });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── Admin: Broadcast to a role group ─────────────────────────────────────────
exports.sendBulk = async (req, res) => {
  try {
    const { title, body, type = 'system', target = 'all', channel = 'in-app', data } = req.body;

    const userFilter = { isActive: true, isBlocked: false };
    if (target === 'customers') userFilter.role = 'customer';
    if (target === 'owners')    userFilter.role = 'owner';

    const users = await User.find(userFilter).select('_id fcmTokens').lean();
    if (!users.length) return errorResponse(res, 400, 'No users matched the target');

    // Persist in-app notifications
    const notifs = users.map((u) => ({
      recipient: u._id,
      title,
      body,
      type,
      channel,
      data,
    }));
    await Notification.insertMany(notifs, { ordered: false });

    // Push via FCM
    let pushSent = 0;
    if (channel === 'push') {
      const tokens = users.flatMap((u) => u.fcmTokens ?? []).filter(Boolean);
      if (tokens.length > 0) {
        await sendMulticastNotification(tokens, title, body).catch(() => {});
        pushSent = tokens.length;
      }
    }

    return successResponse(res, 200, 'Broadcast sent', {
      totalUsers: users.length,
      pushSent,
    });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── Admin: Notification stats (by type + channel) ────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const { from, to } = req.query;
    const match = {};
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to)   match.createdAt.$lte = new Date(to);
    }

    const [byType, byChannel, readRate] = await Promise.all([
      Notification.aggregate([
        { $match: match },
        { $group: { _id: '$type', total: { $sum: 1 }, read: { $sum: { $cond: ['$isRead', 1, 0] } } } },
        { $sort: { total: -1 } },
      ]),
      Notification.aggregate([
        { $match: match },
        { $group: { _id: '$channel', count: { $sum: 1 } } },
      ]),
      Notification.aggregate([
        { $match: match },
        {
          $group: {
            _id:         null,
            total:       { $sum: 1 },
            totalRead:   { $sum: { $cond: ['$isRead', 1, 0] } },
          },
        },
      ]),
    ]);

    const rr = readRate[0] || { total: 0, totalRead: 0 };
    return successResponse(res, 200, 'Notification stats', {
      byType,
      byChannel,
      readRate: rr.total ? parseFloat(((rr.totalRead / rr.total) * 100).toFixed(1)) : 0,
      total: rr.total,
    });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

// ─── Admin: All notifications (platform-wide) ────────────────────────────────
exports.getAllNotifications = async (req, res) => {
  try {
    const { type, userId, isRead, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type)   filter.type      = type;
    if (userId) filter.recipient = userId;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const total = await Notification.countDocuments(filter);
    const notifications = await Notification.find(filter)
      .populate('recipient', 'name email role')
      .sort('-createdAt')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    return successResponse(res, 200, 'All notifications', {
      notifications,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};
