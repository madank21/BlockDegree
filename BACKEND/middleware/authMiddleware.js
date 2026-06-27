// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const supabase = require("../database/supabase"); // your Supabase client
const { logger } = require("../src/utils/logger");

// ─── Strict Authentication (requires valid token) ─────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization Bearer token required" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from Supabase instead of Mongoose
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "User not found" });
    }
    if (!user.is_active) {
      return res.status(401).json({ error: "Account deactivated" });
    }

    req.user = user; // contains id, role, isActive, email, etc.
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    logger.error(`[Auth] ${error.message}`);
    return res.status(401).json({ error: "Authentication failed" });
  }
};

// ─── Optional Authentication (proceeds even without/invalid token) ─────────────
const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", decoded.userId)
      .single();

    if (user && user.isActive) {
      req.user = user;
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
    if (error.name !== "TokenExpiredError" && error.name !== "JsonWebTokenError") {
      logger.warn(`[OptionalAuth] ${error.message}`);
    }
  }
  next();
};

// ─── Role‑based access control (must be used after `authenticate`) ─────────────
const requireRole = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized – no user attached" });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden – insufficient privileges" });
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRole,
};