const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notification.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

// ── User (customer / owner / admin) ───────────────────────────────────────────
// GET  /?type=booking_confirmed,payment_failed&isRead=false&page=1&limit=20
router.get('/',                  ctrl.getNotifications);
// GET  /unread-count?grouped=true  →  { total, byType }
router.get('/unread-count',      ctrl.getUnreadCount);

router.patch('/mark-all-read',   ctrl.markAllRead);
router.patch('/mark-multiple',   ctrl.markMultipleRead);   // body: { ids: [...] }
router.patch('/:id/read',        ctrl.markRead);

// DELETE /clear?type=offer  →  clears read notifications (optional type filter)
router.delete('/clear',          ctrl.clearAll);
router.delete('/:id',            ctrl.deleteNotification);

// ── Admin only ─────────────────────────────────────────────────────────────────
router.get('/admin/all',         authorize('admin'), ctrl.getAllNotifications);
router.get('/admin/stats',       authorize('admin'), ctrl.getStats);
router.post('/admin/send',       authorize('admin'), ctrl.sendToUser);
router.post('/admin/broadcast',  authorize('admin'), ctrl.sendBulk);

module.exports = router;
