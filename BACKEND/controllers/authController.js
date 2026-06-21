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

// Import Supabase admin and notification service
const { getSupabaseAdmin } = require("../database/supabase");
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

// ─── Helper: build user response object ──────────────────────────────────────
const buildUserResponse = (user) => {
  // user is the raw DB row with first_name, last_name, etc.
  // Compute full name for frontend compatibility
  const fullName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`.trim()
    : user.name || ''; // fallback if name exists

  return {
    id: user.id,
    name: fullName,
    email: user.email,
    role: user.role,
    studentId: user.student_id || null,
    institutionName: user.institution_name || null,
    walletAddress: user.wallet_address || null,
    isActive: user.is_active,
    createdAt: user.created_at,
    lastLogin: user.last_login,
  };
};

// ─── Public Routes ────────────────────────────────────────────────────────────

// POST /api/v1/auth/register
const register = asyncHandler(async (req, res) => {
  // Accept both 'name' (from frontend) and optionally first_name/last_name
  const {
    name,
    email,
    password,
    role = "student",
    student_id,
    registrationNumber, // frontend sends this
    institution_name,
  } = req.body;

  // Check if email already exists
  const exists = await User.emailExists(email);
  if (exists) return sendError(res, "Email already registered", 409);

  // Split full name into first and last
  let firstName = '';
  let lastName = '';
  if (name) {
    const parts = name.trim().split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  } else {
    // Fallback: if first_name and last_name are provided directly
    firstName = req.body.first_name || '';
    lastName = req.body.last_name || '';
  }

  // Determine student_id: use provided student_id or registrationNumber
  const studentId = student_id || registrationNumber || null;

  // Create user (User.create should accept all these fields)
  const user = await User.create({
    first_name: firstName,
    last_name: lastName,
    email,
    password,          // User.create will hash it
    role,
    student_id: studentId,
    institution_name: institution_name || null,
    is_active: true,
  });

  // Log the registration
  await AuditLog.create({
    action: "USER_REGISTERED",
    actorId: user.id,
    actorRole: role,
    details: { email, role },
  });

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  logger.info(`[Auth] Registered: ${email} (${role})`);

  // Build response with computed name
  const userResponse = buildUserResponse(user);

  return sendCreated(res, {
    user: userResponse,
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

  // Update last login asynchronously (fire-and-forget)
  User.update(user.id, { last_login: new Date().toISOString() }).catch(() => {});

  await AuditLog.create({
    action: "USER_LOGIN",
    actorId: user.id,
    actorRole: user.role,
    details: { email },
  });

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  logger.info(`[Auth] Login: ${email} (${user.role})`);

  const userResponse = buildUserResponse(user);

  return sendSuccess(res, {
    user: userResponse,
    accessToken,
    refreshToken,
  }, "Login successful");
});

// GET /api/v1/auth/me
const getMe = asyncHandler(async (req, res) => {
  // req.user is attached by authMiddleware; it may already have first_name/last_name
  // But to be safe, fetch fresh from DB
  const user = await User.findById(req.user.id);
  if (!user) return sendError(res, "User not found", 404);

  const userResponse = buildUserResponse(user);
  return sendSuccess(res, { user: userResponse }, "Profile retrieved");
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

// ─── Protected Routes ──────────────────────────────────────────────────────────

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
    const userResponse = buildUserResponse(updated);
    return res.status(200).json({
      success: true,
      message: 'Profile updated',
      data: { user: userResponse },
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
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  refreshToken,
};