const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const { errorResponse } = require('../utils/response');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select('-password -otp -refreshTokens');
    if (!user) return errorResponse(res, 401, 'User not found');
    if (!user.isActive) return errorResponse(res, 401, 'Account deactivated');
    if (user.isBlocked) return errorResponse(res, 403, 'Account suspended. Contact support.');

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'Session expired. Please login again.');
    }
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 401, 'Invalid token.');
    }
    return errorResponse(res, 401, 'Authentication failed.');
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, `Access denied. Required role: ${roles.join(' or ')}`);
    }
    next();
  };
};

// Optional auth — attaches user if token present, but doesn't block if not
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-password -otp -refreshTokens');
    if (user && user.isActive && !user.isBlocked) req.user = user;
  } catch {
    // Token invalid — continue without auth
  }
  next();
};

module.exports = { protect, authorize, optionalAuth };
