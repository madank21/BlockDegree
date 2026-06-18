// /controllers/authController.js — Supabase only
const asyncHandler = require("express-async-handler");
const jwt      = require("jsonwebtoken");
const User     = require("../models/User");
const AuditLog = require("../models/AuditLog");
const {
  sendCreated, sendSuccess,
  sendError,   sendUnauthorized,
} = require("../src/utils/response");
const { logger } = require("../src/utils/logger");

const generateTokens = (userId, role) => ({
  accessToken: jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  ),
  refreshToken: jwt.sign(
    { userId, role },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d" }
  ),
});

// POST /api/v1/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = "student", student_id, institution_name } = req.body;

  const exists = await User.emailExists(email);
  if (exists) return sendError(res, "Email already registered", 409);

  const user = await User.create({ name, email, password, role, studentId: student_id, institutionName: institution_name });

  await AuditLog.create({ action: "USER_REGISTERED", actorId: user.id, actorRole: role, details: { email, role } });

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  logger.info(`[Auth] Registered: ${email} (${role})`);

  return sendCreated(res, {
    user: {
      id:              user.id,
      name:            user.name,
      email:           user.email,
      role:            user.role,
      studentId:       user.student_id,
      institutionName: user.institution_name,
    },
    accessToken,
    refreshToken,
  }, "Registration successful");
});

// POST /api/v1/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findByEmail(email, true);
  if (!user)          return sendUnauthorized(res, "Invalid email or password");
  if (!user.is_active) return sendUnauthorized(res, "Account deactivated");

  const isValid = await User.comparePassword(password, user.password_hash);
  if (!isValid) return sendUnauthorized(res, "Invalid email or password");

  User.update(user.id, { lastLogin: new Date().toISOString() }).catch(() => {});
  await AuditLog.create({ action: "USER_LOGIN", actorId: user.id, actorRole: user.role, details: { email } });

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  logger.info(`[Auth] Login: ${email} (${user.role})`);

  return sendSuccess(res, {
    user: {
      id:               user.id,
      name:             user.name,
      email:            user.email,
      role:             user.role,
      studentId:        user.student_id,
      institutionName:  user.institution_name,
      walletAddress:    user.wallet_address,
    },
    accessToken,
    refreshToken,
  }, "Login successful");
});

// GET /api/v1/auth/profile
const getProfile = asyncHandler(async (req, res) => {
  return sendSuccess(res, { user: req.user }, "Profile retrieved");
});

// POST /api/v1/auth/refresh
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) return sendUnauthorized(res, "Refresh token required");

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const { accessToken, refreshToken: newRefresh } = generateTokens(decoded.userId, decoded.role);
    return sendSuccess(res, { accessToken, refreshToken: newRefresh }, "Token refreshed");
  } catch {
    return sendUnauthorized(res, "Invalid or expired refresh token");
  }
});

module.exports = { register, login, getProfile, refreshToken };