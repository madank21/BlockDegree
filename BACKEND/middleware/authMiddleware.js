// /middleware/authMiddleware.js — Supabase only
const jwt  = require("jsonwebtoken");
const User = require("../models/User");
const { sendUnauthorized } = require("../src/utils/response");
const { logger } = require("../src/utils/logger");

// ─── Strict Authentication (requires valid token) ─────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return sendUnauthorized(res, "Authorization Bearer token required");
    }

    const token   = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user)          return sendUnauthorized(res, "User not found");
    if (!user.is_active) return sendUnauthorized(res, "Account deactivated");

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") return sendUnauthorized(res, "Token expired");
    if (error.name === "JsonWebTokenError") return sendUnauthorized(res, "Invalid token");
    logger.error(`[Auth] ${error.message}`);
    return sendUnauthorized(res, "Authentication failed");
  }
};

// ─── Optional Authentication (proceeds even without/invalid token) ─────────────
const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // If no token, just continue with req.user = null
  if (!authHeader?.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (user && user.is_active) {
      req.user = user;   // attach user if valid and active
    } else {
      req.user = null;   // user not found or inactive → treat as unauthenticated
    }
  } catch (error) {
    // Token invalid/expired → still continue, but user is null
    req.user = null;
    // Optionally log the error silently (not critical)
    if (error.name !== 'TokenExpiredError' && error.name !== 'JsonWebTokenError') {
      logger.warn(`[OptionalAuth] ${error.message}`);
    }
  }
  next();
};

// ─── Exports ────────────────────────────────────────────────────────────────────
module.exports = {
  authenticate,
  optionalAuthenticate,
};