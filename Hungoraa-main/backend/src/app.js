const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');

const { errorHandler, notFound } = require('./middleware/error.middleware');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth.routes');

const app = express();

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());
app.use(hpp());

// ─── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  'https://hungora.com',
  'https://www.hungora.com',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
];

// Vite dev servers bump to the next free port whenever one's already taken
// (3002 -> 3003 -> 3004 ...), so a fixed allowlist breaks constantly in dev.
const isLocalDevOrigin = (origin) =>
  process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
  })
);

// ─── Compression & Parsing ───────────────────────────────────────────────────
app.use(compression());
// Razorpay webhooks must be verified against the untouched raw body. The route
// (payment.routes.js) parses it with express.raw(), so skip this global JSON
// parser for that single path; otherwise req.body is already an object and the
// HMAC check throws for every webhook.
const jsonParser = express.json({ limit: '10mb' });
app.use((req, res, next) =>
  req.originalUrl.startsWith('/api/payments/webhook') ? next() : jsonParser(req, res, next)
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Uploaded files (local disk — see config/upload.js) ───────────────────────
// helmet's default Cross-Origin-Resource-Policy blocks cross-origin <img>
// loads, which matters here since dev clients load these from a different
// origin than the API; images are meant to be publicly viewable anyway.
const { UPLOAD_ROOT } = require('./config/upload');
app.use(
  '/uploads',
  express.static(UPLOAD_ROOT, {
    maxAge: '365d',
    immutable: true,
    setHeaders: (res) => {
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      res.set('Access-Control-Allow-Origin', '*');
    },
  })
);

// ─── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (msg) => logger.info(msg.trim()) },
    })
  );
}

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please slow down.' },
  })
);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'DineSmart API', timestamp: new Date().toISOString() })
);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

const userRoutes = require('./routes/user.routes');
const restaurantRoutes = require('./routes/restaurant.routes');
const bookingRoutes = require('./routes/booking.routes');
const menuRoutes = require('./routes/menu.routes');
const offerRoutes = require('./routes/offer.routes');
const tableRoutes = require('./routes/table.routes');
const reviewRoutes = require('./routes/review.routes');
const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const branchRoutes = require('./routes/branch.routes');
const adminRoutes = require('./routes/admin.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const commissionRoutes = require('./routes/commission.routes');
const settlementRoutes = require('./routes/settlement.routes');

app.use('/api/users', userRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api', reviewRoutes);
app.use('/api', branchRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/bill-payments', require('./routes/billPayment.routes'));
app.use('/api/settings', require('./routes/settings.routes'));

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
