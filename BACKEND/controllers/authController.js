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
  // user is already mapped from DB (camelCase properties)
  return {
    id: user.id,
    name: user.name || '',
    email: user.email,
    role: user.role,
    studentId: user.studentId || null,
    institutionName: user.institutionName || null,
    walletAddress: user.walletAddress || null,
    isActive: user.isActive,     // now available
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  };
};

// ─── Public Routes ────────────────────────────────────────────────────────────

// POST /api/v1/auth/register
const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role = "student",
    student_id,
    registrationNumber,
    institution_name,
  } = req.body;

  console.log(`[REGISTER] Incoming payload:`, {
    name,
    email,
    passwordProvided: !!password,
    role,
    student_id,
    registrationNumber,
    institution_name,
  });

  // Check if email already exists
  const exists = await User.emailExists(email);
  if (exists) {
    console.log(`[REGISTER] Email already exists: ${email}`);
    return sendError(res, "Email already registered", 409);
  }

  let fullName = name || '';
  if (!fullName && req.body.first_name && req.body.last_name) {
    fullName = `${req.body.first_name} ${req.body.last_name}`.trim();
  }
  if (!fullName) fullName = email.split('@')[0];

  const studentId = student_id || registrationNumber || null;

  console.log(`[REGISTER] Creating user with:`, {
    name: fullName,
    email,
    role,
    student_id: studentId,
    institution_name,
    is_active: true,
  });

  try {
    const user = await User.create({
      name: fullName,
      email,
      password,
      role,
      student_id: studentId,
      institution_name: institution_name || null,
      is_active: true,
    });

    console.log(`[REGISTER] User created successfully:`, {
      id: user.id,
      email: user.email,
      role: user.role,
    });

    await AuditLog.create({
      action: "USER_REGISTERED",
      actorId: user.id,
      actorRole: role,
      details: { email, role },
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    logger.info(`[Auth] Registered: ${email} (${role})`);

    const userResponse = buildUserResponse(user);

    console.log(`[REGISTER] Registration successful for ${email}`);

    return sendCreated(res, {
      user: userResponse,
      accessToken,
      refreshToken,
    }, "Registration successful");
  } catch (error) {
    console.error(`[REGISTER] Error creating user:`, error.message);
    console.error(error.stack);
    throw new Error(`User creation failed: ${error.message}`);
  }
});

// POST /api/v1/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  console.log(`[LOGIN] Attempt for email: ${email}`);

  // ✅ FIX: remove the second argument (true) – it was not used
  const user = await User.findByEmail(email);
  if (!user) {
    console.log(`[LOGIN] User not found: ${email}`);
    return sendUnauthorized(res, "Invalid email or password");
  }

  console.log(`[LOGIN] User found:`, {
    id: user.id,
    email: user.email,
    role: user.role,
    is_active: user.isActive,          // now correctly retrieved
    password_hash_exists: !!user.passwordHash,
  });

  // ✅ Use user.isActive (camelCase) – already mapped
  if (!user.isActive) {
    console.log(`[LOGIN] User account deactivated: ${email}`);
    return sendUnauthorized(res, "Account deactivated");
  }

  // Compare password – use user.passwordHash
  const isValid = await User.comparePassword(password, user.passwordHash);
  console.log(`[LOGIN] Password comparison result: ${isValid}`);

  if (!isValid) {
    console.log(`[LOGIN] Invalid password for: ${email}`);
    return sendUnauthorized(res, "Invalid email or password");
  }

  // Update last login asynchronously
  User.update(user.id, { lastLogin: new Date().toISOString() }).catch((err) => {
    console.error(`[LOGIN] Failed to update lastLogin for ${user.id}:`, err.message);
  });

  await AuditLog.create({
    action: "USER_LOGIN",
    actorId: user.id,
    actorRole: user.role,
    details: { email },
  });

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  logger.info(`[Auth] Login: ${email} (${user.role})`);

  const userResponse = buildUserResponse(user);

  console.log(`[LOGIN] Login successful for ${email}`);

  return sendSuccess(res, {
    user: userResponse,
    accessToken,
    refreshToken,
  }, "Login successful");
});

// GET /api/v1/auth/me
const getMe = asyncHandler(async (req, res) => {
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
    const allowedFields = ['name', 'phone', 'organization', 'institutionName', 'institution_name'];
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
    const isMatch = await User.comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await User.update(req.user.id, { passwordHash: newHash });

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
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If that email exists, a reset link has been sent',
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000).toISOString();

    await User.update(user.id, {
      passwordResetToken: token,
      passwordResetExpires: expires,
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
      passwordHash: newHash,
      passwordResetToken: null,
      passwordResetExpires: null,
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
      emailVerified: true,
      emailVerificationToken: null,
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