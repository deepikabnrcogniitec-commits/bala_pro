const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:     { type: String, required: true },
    body:      { type: String, required: true },
    type: {
      type: String,
      enum: [
        // Booking
        'booking_confirmed',
        'booking_cancelled',
        'booking_reminder',
        'booking_no_show',
        // Payments
        'payment_failed',
        'refund_completed',
        'deposit_received',
        // Offers
        'offer_approved',
        'offer_rejected',
        // Settlement
        'settlement_completed',
        'settlement_failed',
        // General
        'offer',
        'review',
        'system',
      ],
      required: true,
    },
    data:    { type: mongoose.Schema.Types.Mixed },
    isRead:  { type: Boolean, default: false },
    readAt:  Date,
    isSent:  { type: Boolean, default: false },
    channel: { type: String, enum: ['push', 'email', 'sms', 'in-app'], default: 'in-app' },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
