const { asyncHandler, AppError } = require('../middleware/errorMiddleware');
const { generateTokens, verifyRefreshToken } = require('../middleware/authMiddleware');
const { sendSuccess, sendError, sendCreated } = require('../src/utils/response');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const notificationService = require('../services/notificationService');
const { logger } = require('../src/utils/logger');
const crypto = require('crypto');

// ─── Register ──────────────────────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const {
    email, password, first_name, last_name,
    role, phone, institution_name, institution_id,
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return sendError(res, 'An account with this email already exists.', 409);
  }

  // Prevent admin self-registration
  if (role === 'admin') {
    return sendError(res, 'Admin accounts cannot be self-registered.', 403);
  }

  // Generate email verification token
  const emailVerificationToken = crypto.randomBytes(32).toString('hex');
  const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Create user
  const user = await User.create({
    email: email.toLowerCase(),
    password,
    first_name,
    last_name,
    role: role || 'graduate',
    phone: phone || null,
    institution_name: institution_name || null,
    institution_id: institution_id || null,
    email_verification_token: emailVerificationToken,
    email_verification_expires: emailVerificationExpires,
  });

  // Send verification email (non-blocking)
  notificationService.sendWelcomeEmail(
    { email: email.toLowerCase(), first_name },
    emailVerificationToken
  ).catch(err => logger.error('Welcome email failed:', err.message));

  // Audit log
  await AuditLog.log('user_created', {
    userId: user.id,
    resourceType: 'user',
    resourceId: user.id,
    newData: { email, role },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: req.requestId,
  });

  logger.info(`New user registered: ${email} (${role})`);

  return sendCreated(res, {
    id: user.id,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
  }, 'Account created successfully. Please verify your email.');
});

// ─── Login ─────────────────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user with password hash
  const user = await User.findByEmail(email.toLowerCase(), true);
  if (!user) {
    return sendError(res, 'Invalid email or password.', 401);
  }

  // Check if account is locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    return sendError(res, `Account locked. Try again in ${remaining} minutes.`, 423);
  }

  // Check if account is active
  if (!user.is_active) {
    return sendError(res, 'Account has been deactivated. Contact support.', 401);
  }

  // Verify password
  const isPasswordValid = await User.comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    const attempts = (user.failed_login_attempts || 0) + 1;
    const MAX_ATTEMPTS = 5;
    
    let lockedUntil = null;
    if (attempts >= MAX_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
      logger.warn(`Account locked after ${attempts} failed attempts: ${email}`);
    }
    
    await User.updateLoginAttempts(user.id, attempts, lockedUntil);

    await AuditLog.log('login', {
      userId: user.id,
      success: false,
      errorMessage: 'Invalid password',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (lockedUntil) {
      return sendError(res, 'Too many failed attempts. Account locked for 30 minutes.', 423);
    }

    return sendError(res, 'Invalid email or password.', 401);
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  // Update last login
  await User.update(user.id, { refresh_token: refreshToken });
  await User.updateLastLogin(user.id);

  // Audit log
  await AuditLog.log('login', {
    userId: user.id,
    resourceType: 'user',
    resourceId: user.id,
    success: true,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: req.requestId,
  });

  logger.info(`User logged in: ${email}`);

  const { password_hash, refresh_token, email_verification_token, password_reset_token, ...safeUser } = user;

  return sendSuccess(res, {
    user: safeUser,
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  }, 'Login successful');
});

// ─── Refresh Token ─────────────────────────────────────────────────────────────
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return sendError(res, 'Refresh token is required.', 400);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (err) {
    return sendError(res, 'Invalid or expired refresh token.', 401);
  }

  const user = await User.findById(decoded.id, true);
  if (!user || user.refresh_token !== token) {
    return sendError(res, 'Invalid refresh token.', 401);
  }

  if (!user.is_active) {
    return sendError(res, 'Account is deactivated.', 401);
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.role);
  await User.update(user.id, { refresh_token: newRefreshToken });

  return sendSuccess(res, {
    accessToken,
    refreshToken: newRefreshToken,
  }, 'Token refreshed successfully');
});

// ─── Logout ────────────────────────────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  await User.update(req.user.id, { refresh_token: null });

  await AuditLog.log('logout', {
    userId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return sendSuccess(res, null, 'Logged out successfully');
});

// ─── Get Current User ──────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  return sendSuccess(res, user, 'User profile retrieved');
});

// ─── Update Profile ────────────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['first_name', 'last_name', 'phone', 'institution_name'];
  const updateData = {};

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  if (req.file) {
    updateData.avatar_url = `/uploads/avatars/${req.file.filename}`;
  }

  const updatedUser = await User.update(req.user.id, updateData);

  await AuditLog.log('user_updated', {
    userId: req.user.id,
    resourceType: 'user',
    resourceId: req.user.id,
    newData: updateData,
    ipAddress: req.ip,
  });

  return sendSuccess(res, updatedUser, 'Profile updated successfully');
});

// ─── Change Password ───────────────────────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findByEmail(req.user.email, true);
  const isValid = await User.comparePassword(currentPassword, user.password_hash);

  if (!isValid) {
    return sendError(res, 'Current password is incorrect.', 400);
  }

  await User.update(req.user.id, { password: newPassword });

  await AuditLog.log('password_changed', {
    userId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return sendSuccess(res, null, 'Password changed successfully');
});

// ─── Forgot Password ───────────────────────────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findByEmail(email.toLowerCase());

  // Always return success to prevent email enumeration
  const successMessage = 'If an account with that email exists, a password reset link has been sent.';

  if (!user) {
    return sendSuccess(res, null, successMessage);
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await User.update(user.id, {
    password_reset_token: resetToken,
    password_reset_expires: resetExpires,
  });

  notificationService.sendPasswordResetEmail(user, resetToken)
    .catch(err => logger.error('Password reset email failed:', err.message));

  return sendSuccess(res, null, successMessage);
});

// ─── Reset Password ────────────────────────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const user = await User.resetPassword(token, newPassword);
  if (!user) {
    return sendError(res, 'Invalid or expired password reset token.', 400);
  }

  await AuditLog.log('password_changed', {
    userId: user.id,
    metadata: { method: 'reset' },
    ipAddress: req.ip,
  });

  return sendSuccess(res, null, 'Password reset successfully. Please log in.');
});

// ─── Verify Email ──────────────────────────────────────────────────────────────
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const user = await User.verifyEmail(token);
  if (!user) {
    return sendError(res, 'Invalid or expired verification token.', 400);
  }

  return sendSuccess(res, null, 'Email verified successfully. You can now log in.');
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
};