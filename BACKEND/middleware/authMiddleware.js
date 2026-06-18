// /middleware/authMiddleware.js — Supabase only
const jwt  = require("jsonwebtoken");
const User = require("../models/User");
const { sendUnauthorized } = require("../src/utils/response");
const { logger } = require("../src/utils/logger");

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

module.exports = { authenticate };