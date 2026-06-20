// BACKEND/controllers/authController.js
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const {
  sendCreated,
  sendSuccess,
  sendError,
  sendUnauthorized,
} = require("../src/utils/response");
const { logger } = require("../src/utils/logger");

// Import Supabase admin and notification service (adjust paths as needed)
const { getSupabaseAdmin } = require("../config/supabase");
const notificationService = require("../services/notificationService");

// ─── Token Generation ──────────────────────────────────────────────────────────
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

// ─── Public Routes ────────────────────────────────────────────────────────────

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
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.student_id,
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
  if (!user) return sendUnauthorized(res, "Invalid email or password");
  if (!user.is_active) return sendUnauthorized(res, "Account deactivated");

  const isValid = await User.comparePassword(password, user.password_hash);
  if (!isValid) return sendUnauthorized(res, "Invalid email or password");

  User.update(user.id, { lastLogin: new Date().toISOString() }).catch(() => {});
  await AuditLog.create({ action: "USER_LOGIN", actorId: user.id, actorRole: user.role, details: { email } });

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  logger.info(`[Auth] Login: ${email} (${user.role})`);

  return sendSuccess(res, {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId: user.student_id,
      institutionName: user.institution_name,
      walletAddress: user.wallet_address,
    },
    accessToken,
    refreshToken,
  }, "Login successful");
});

// GET /api/v1/auth/me  (renamed from getProfile to match route)
const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, { user: req.user }, "Profile retrieved");
});

// POST /api/v1/auth/refresh-token
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

// ─── Protected Routes (added from Step 11) ──────────────────────────────────

// POST /api/v1/auth/logout
const logout = async (req, res, next) => {
  try {
    // JWT is stateless; client drops the token.
    // Optionally: blacklist the token in Redis here.
    logger.info('User logged out', {
      userId: req.user?.id,
      requestId: req.requestId,
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/auth/me
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['first_name', 'last_name', 'phone', 'organization'];
    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    const updated = await User.update(req.user.id, updates);
    return res.status(200).json({
      success: true,
      message: 'Profile updated',
      data: { user: updated },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'currentPassword and newPassword are required',
      });
    }

    const user = await User.findById(req.user.id);
    const isMatch = await User.comparePassword(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await User.update(req.user.id, { password_hash: newHash });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findByEmail(email);
    // Always return 200 to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If that email exists, a reset link has been sent',
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    await User.update(user.id, {
      password_reset_token: token,
      password_reset_expires: expires,
    });

    await notificationService.sendPasswordResetEmail(user.email, { token });

    return res.status(200).json({
      success: true,
      message: 'If that email exists, a reset link has been sent',
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and newPassword are required',
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, password_reset_expires')
      .eq('password_reset_token', token)
      .single();

    if (error || !user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    if (new Date(user.password_reset_expires) < new Date()) {
      return res.status(400).json({ success: false, message: 'Token has expired' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await User.update(user.id, {
      password_hash: newHash,
      password_reset_token: null,
      password_reset_expires: null,
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/auth/verify-email/:token
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email_verified')
      .eq('email_verification_token', token)
      .single();

    if (error || !user) {
      return res.status(400).json({ success: false, message: 'Invalid verification token' });
    }

    if (user.email_verified) {
      return res.status(200).json({ success: true, message: 'Email already verified' });
    }

    await User.update(user.id, {
      email_verified: true,
      email_verification_token: null,
    });

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ─── Module Exports ──────────────────────────────────────────────────────────
module.exports = {
  register,
  login,
  logout,
  getMe,        // renamed from getProfile to match route
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  refreshToken,
};