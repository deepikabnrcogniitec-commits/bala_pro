require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/database');
const { initFirebase } = require('./src/config/firebase');
const logger = require('./src/utils/logger');
const { startHoldReleaseJob } = require('./src/services/holdRelease.service');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  initFirebase();
  startHoldReleaseJob();

  const server = http.createServer(app);

  server.listen(PORT, () => {
    logger.info(`DineSmart API running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Rejection: ${reason}`);
    shutdown('UnhandledRejection');
  });
};

startServer();
