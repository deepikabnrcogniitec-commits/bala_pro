const Booking = require('../models/Booking');
const logger = require('../utils/logger');

const HOLD_MINUTES = 5;

// Releases table holds whose 5-minute window has passed without a paid deposit.
// The update filter re-checks status and isPaid, so a booking paid a moment ago is never released.
const releaseExpiredHolds = async (now = new Date()) => {
  const expired = await Booking.find({ status: 'held', isPaid: false, holdExpiresAt: { $lte: now } })
    .select('_id')
    .lean();

  let released = 0;
  for (const { _id } of expired) {
    const result = await Booking.updateOne(
      { _id, status: 'held', isPaid: false },
      {
        $set: {
          status: 'cancelled',
          holdStatus: 'released',
          cancelledAt: now,
          cancellationReason: 'Hold expired',
        },
        $push: {
          statusHistory: { status: 'cancelled', reason: 'Hold expired before deposit was paid', timestamp: now },
        },
      }
    );
    released += result.modifiedCount || 0;
  }

  if (released > 0) logger.info(`Released ${released} expired table hold(s)`);
  return released;
};

// Runs once at startup and then every minute. The timer is unref'd so it never keeps the process alive.
const startHoldReleaseJob = (intervalMs = 60 * 1000) => {
  const run = () => releaseExpiredHolds().catch((err) => logger.error('Hold release job failed:', err.message));
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return timer;
};

module.exports = { HOLD_MINUTES, releaseExpiredHolds, startHoldReleaseJob };
