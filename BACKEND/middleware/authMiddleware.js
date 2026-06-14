const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../src/utils/response');
const { logger } = require('../src/utils/logger');

const authenticate = async (req, res, next) => {
  try {
    // 1. Extract token
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return sendError(res, 'Authentication required. Please log in.', 401);
    }

    // 2. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Token has expired. Please log in again.', 401);
      }
      if (err.name === 'JsonWebTokenError') {
        return sendError(res, 'Invalid token. Please log in again.', 401);
      }
      throw err;
    }

    // 3. Check user exists and is active
    const user = await User.findById(decoded.id);
    if (!user) {
      return sendError(res, 'User no longer exists.', 401);
    }

    if (!user.is_active) {
      return sendError(res, 'Account has been deactivated.', 401);
    }

    if (!user.is_email_verified && process.env.NODE_ENV === 'production') {
      return sendError(res, 'Please verify your email address.', 401);
    }

    // 4. Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return sendError(res, `Account is locked. Try again in ${remainingTime} minutes.`, 423);
    }

    // 5. Attach user to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return sendError(res, 'Authentication failed.', 500);
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user && user.is_active) {
      req.user = user;
    }
  } catch (error) {
    // Silently fail for optional auth
  }
  next();
};

// Generate tokens
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { id: userId, role, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  generateTokens,
  verifyRefreshToken,
};