const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
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
const { getSupabaseAdmin } = require("../database/supabase");
const notificationService = require("../services/notificationService");

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getRefreshExpiryDate = () => {
  const days = parseInt(JWT_REFRESH_EXPIRES_IN, 10) || 7;
  if (JWT_REFRESH_EXPIRES_IN.endsWith("d")) {
    return new Date(Date.now() + days * 86400000).toISOString();
  }
  return new Date(Date.now() + 7 * 86400000).toISOString();
};

const generateTokens = (userId, role) => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  return {
    accessToken: jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }),
    refreshToken: jwt.sign({ userId, role }, refreshSecret, { expiresIn: JWT_REFRESH_EXPIRES_IN }),
  };
};

const persistRefreshToken = async (userId, refreshToken) => {
  const tokenHash = hashRefreshToken(refreshToken);
  await User.setRefreshToken(userId, tokenHash, getRefreshExpiryDate());
};

const buildUserResponse = (user) => ({
  id: user.id,
  name: user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || "",
  email: user.email,
  role: user.role,
  studentId: user.student_id || user.studentId || null,
  institutionName: user.institution_name || user.institutionName || null,
  walletAddress: user.wallet_address || user.walletAddress || null,
  isActive: user.is_active ?? user.isActive,
  emailVerified: user.email_verified ?? user.emailVerified ?? false,
  createdAt: user.created_at || user.createdAt,
  lastLogin: user.last_login || user.lastLogin,
});

const sanitizeRole = (role) => {
  const allowed = ["student", "employer", "university"];
  return allowed.includes(role) ? role : "student";
};

// POST /api/v1/auth/register
const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role: requestedRole = "student",
    student_id,
    registrationNumber,
    institution_name,
  } = req.body;

  const role = sanitizeRole(requestedRole);

  const exists = await User.emailExists(email);
  if (exists) {
    return sendError(res, "Email already registered", 409);
  }

  let fullName = name || "";
  if (!fullName && req.body.first_name && req.body.last_name) {
    fullName = `${req.body.first_name} ${req.body.last_name}`.trim();
  }
  if (!fullName) fullName = email.split("@")[0];

  const studentId = student_id || registrationNumber || null;
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name: fullName,
    email,
    passwordHash: hashedPassword,
    role,
    student_id: studentId,
    institution_name: institution_name || null,
    is_active: true,
  });

  const verifyToken = crypto.randomBytes(32).toString("hex");
  await User.update(user.id, {
    email_verify_token: verifyToken,
    email_verify_expires: new Date(Date.now() + 86400000).toISOString(),
  });

  notificationService.sendWelcomeEmail(user, verifyToken).catch((err) => {
    logger.warn(`[Auth] Welcome email failed for ${email}: ${err.message}`);
  });

  await AuditLog.create({
    action: "USER_REGISTERED",
    actorId: user.id,
    actorRole: role,
    details: { email, role },
  });

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  await persistRefreshToken(user.id, refreshToken);
  logger.info(`[Auth] Registered: ${email} (${role})`);

  return sendCreated(res, {
    user: buildUserResponse(user),
    accessToken,
    refreshToken,
  }, "Registration successful");
});

// POST /api/v1/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findByEmail(email);
  if (!user) {
    return sendUnauthorized(res, "Invalid email or password");
  }

  if (user.is_active === false || user.isActive === false) {
    return sendUnauthorized(res, "Account deactivated");
  }

  if (!user.passwordHash) {
    return sendUnauthorized(res, "Invalid email or password");
  }

  const isValid = await User.comparePassword(password, user.passwordHash);
  if (!isValid) {
    return sendUnauthorized(res, "Invalid email or password");
  }

  User.update(user.id, { lastLogin: new Date().toISOString() }).catch(() => {});

  await AuditLog.create({
    action: "USER_LOGIN",
    actorId: user.id,
    actorRole: user.role,
    details: { email },
  });

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  await persistRefreshToken(user.id, refreshToken);
  logger.info(`[Auth] Login: ${email} (${user.role})`);

  return sendSuccess(res, {
    user: buildUserResponse(user),
    accessToken,
    refreshToken,
  }, "Login successful");
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return sendError(res, "User not found", 404);
  return sendSuccess(res, { user: buildUserResponse(user) }, "Profile retrieved");
});

const refreshTokenHandler = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) return sendUnauthorized(res, "Refresh token required");

  try {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, refreshSecret);
    const user = await User.findById(decoded.userId);
    if (!user || user.isActive === false) {
      return sendUnauthorized(res, "Invalid or expired refresh token");
    }

    const tokenData = await User.getRefreshTokenData(decoded.userId);
    if (!tokenData?.refresh_token) {
      return sendUnauthorized(res, "Refresh token has been revoked");
    }

    const tokenHash = hashRefreshToken(token);
    if (tokenData.refresh_token !== tokenHash) {
      return sendUnauthorized(res, "Invalid refresh token");
    }

    if (tokenData.refresh_token_expires && new Date(tokenData.refresh_token_expires) < new Date()) {
      await User.clearRefreshToken(decoded.userId);
      return sendUnauthorized(res, "Refresh token has expired");
    }

    const tokens = generateTokens(user.id, user.role);
    await persistRefreshToken(user.id, tokens.refreshToken);
    return sendSuccess(res, tokens, "Token refreshed");
  } catch {
    return sendUnauthorized(res, "Invalid or expired refresh token");
  }
});

const logout = asyncHandler(async (req, res) => {
  if (req.user?.id) {
    await User.clearRefreshToken(req.user.id);
    logger.info("User logged out", { userId: req.user.id, requestId: req.requestId });
  }
  return sendSuccess(res, null, "Logged out successfully");
});

const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ["name", "phone", "organization", "institution_name"];
    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    const updated = await User.update(req.user.id, updates);
    return res.status(200).json({
      success: true,
      message: "Profile updated",
      data: { user: buildUserResponse(updated) },
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "currentPassword and newPassword are required",
      });
    }

    const user = await User.findById(req.user.id);
    const isMatch = await User.comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await User.update(req.user.id, { passwordHash: newHash });
    await User.clearRefreshToken(req.user.id);

    return res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If that email exists, a reset link has been sent",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000).toISOString();

    await User.update(user.id, {
      password_reset_token: token,
      password_reset_expires: expires,
    });

    notificationService.sendPasswordResetEmail(user, token).catch((err) => {
      logger.warn(`[Auth] Password reset email failed: ${err.message}`);
    });

    return res.status(200).json({
      success: true,
      message: "If that email exists, a reset link has been sent",
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and newPassword are required",
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, password_reset_expires")
      .eq("password_reset_token", token)
      .single();

    if (error || !user) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    if (new Date(user.password_reset_expires) < new Date()) {
      return res.status(400).json({ success: false, message: "Token has expired" });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await User.update(user.id, {
      passwordHash: newHash,
      password_reset_token: null,
      password_reset_expires: null,
    });
    await User.clearRefreshToken(user.id);

    return res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email_verified")
      .eq("email_verify_token", token)
      .single();

    if (error || !user) {
      return res.status(400).json({ success: false, message: "Invalid verification token" });
    }

    if (user.email_verified) {
      return res.status(200).json({ success: true, message: "Email already verified" });
    }

    await User.update(user.id, {
      emailVerified: true,
      email_verify_token: null,
      email_verify_expires: null,
    });

    return res.status(200).json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    next(error);
  }
};

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
  refreshToken: refreshTokenHandler,
};
