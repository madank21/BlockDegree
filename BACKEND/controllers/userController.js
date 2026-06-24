// BACKEND/controllers/userController.js
//
// WHAT WAS BROKEN:
//   1. getUserById   — export was MISSING entirely. Routes and api.ts called it, got "not a function" crash.
//   2. updateUser    — export was MISSING entirely. Admin user-edit panel never worked.
//   3. deleteUser    — export was MISSING entirely. Admin deactivate button never worked.
//   4. sendPaginated — was called as sendPaginated(res, data, total, page, limit, msg)
//                      but response.js signature is sendPaginated(res, data, {count,page,limit,totalPages}, msg)
//                      → caused "pagination.count is undefined" and malformed JSON every time.
//   5. getUsers      — query param `status` was forwarded directly but User.findMany has no `status`
//                      filter — it uses `isActive`. Mapped correctly here.
//
// DEPENDENCIES (all verified against actual files):
//   ../models/User        → User.findMany / findById / update / delete
//   ../models/AuditLog    → AuditLog.create
//   ../src/utils/response → sendSuccess / sendPaginated / sendNotFound / sendError (exact signatures confirmed)
//   ../src/utils/logger   → logger.error
//   express-async-handler → asyncHandler (used throughout project)

'use strict';

const asyncHandler = require('express-async-handler');
const User         = require('../models/User');
const AuditLog     = require('../models/AuditLog');
const {
  sendSuccess,
  sendPaginated,
  sendNotFound,
  sendError,
}                  = require('../src/utils/response');
const { logger }   = require('../src/utils/logger');

// ─── GET /api/v1/users ────────────────────────────────────────────────────────
// Lists all users with optional filters. Admin only (enforced in userRoutes.js).
//
// FIX 4: sendPaginated now receives a proper pagination object as 3rd arg:
//        { count, page, limit, totalPages } — matching response.js exactly.
// FIX 5: `status` query param mapped to `isActive` boolean that User.findMany understands.
const getUsers = asyncHandler(async (req, res) => {
  const {
    page   = 1,
    limit  = 10,
    role,
    search,
    isActive,   // "true" | "false" | undefined
  } = req.query;

  const parsedPage  = parseInt(page,  10) || 1;
  const parsedLimit = parseInt(limit, 10) || 10;

  const filter = {};
  if (role)     filter.role   = role;
  if (search)   filter.search = search;

  // Map the string query param to a real boolean (User.findMany expects boolean | undefined)
  if (isActive === 'true')       filter.isActive = true;
  else if (isActive === 'false') filter.isActive = false;

  const { data, total } = await User.findMany({
    page:  parsedPage,
    limit: parsedLimit,
    ...filter,
  });

  const totalPages = Math.ceil(total / parsedLimit);

  // FIX 4: correct sendPaginated signature
  return sendPaginated(
    res,
    data,
    { count: total, page: parsedPage, limit: parsedLimit, totalPages },
    'Users retrieved'
  );
});

// ─── GET /api/v1/users/:id ────────────────────────────────────────────────────
// FIX 1: This export was completely missing — added from scratch.
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) return sendNotFound(res, 'User');

  // Strip the password hash before sending to client
  const { passwordHash, ...safeUser } = user;
  return sendSuccess(res, { user: safeUser }, 'User retrieved');
});

// ─── PATCH /api/v1/users/:id ─────────────────────────────────────────────────
// FIX 2: This export was completely missing — added from scratch.
// Admin can update role, isActive, institutionName, name on any user.
// Users updating their OWN profile use PATCH /auth/me (authController).
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) return sendNotFound(res, 'User');

  // Whitelist updateable fields — never allow passwordHash from this endpoint
  const ALLOWED = ['name', 'role', 'isActive', 'institutionName', 'institutionId', 'walletAddress'];
  const updates = {};
  for (const field of ALLOWED) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  if (Object.keys(updates).length === 0) {
    return sendError(res, 'No valid fields provided for update.', 400);
  }

  const updated = await User.update(id, updates);

  await AuditLog.create({
    action:     'USER_UPDATED',
    actorId:    req.user.id,
    actorRole:  req.user.role,
    targetId:   id,
    targetType: 'user',
    details:    { updatedFields: Object.keys(updates), email: user.email },
    ipAddress:  req.ip,
  });

  const { passwordHash: _drop, ...safeUpdated } = updated;
  return sendSuccess(res, { user: safeUpdated }, 'User updated successfully');
});

// ─── DELETE /api/v1/users/:id ────────────────────────────────────────────────
// FIX 3: This export was completely missing — added from scratch.
// Performs a soft-delete (sets is_active = false) by default.
// Hard delete available only in dev via ?hard=true.
const deleteUser = asyncHandler(async (req, res) => {
  const { id }   = req.params;
  const hardDelete = req.query.hard === 'true' && process.env.NODE_ENV !== 'production';

  // Prevent self-deletion
  if (id === req.user.id) {
    return sendError(res, 'You cannot deactivate your own account.', 400);
  }

  const user = await User.findById(id);
  if (!user) return sendNotFound(res, 'User');

  await User.delete(id, hardDelete);

  await AuditLog.create({
    action:     hardDelete ? 'USER_HARD_DELETED' : 'USER_DEACTIVATED',
    actorId:    req.user.id,
    actorRole:  req.user.role,
    targetId:   id,
    targetType: 'user',
    details:    { email: user.email, role: user.role, hardDelete },
    ipAddress:  req.ip,
  });

  return sendSuccess(
    res,
    { userId: id, deactivated: true },
    hardDelete ? 'User permanently deleted' : 'User deactivated successfully'
  );
});

// ─── PATCH /api/v1/users/:id/approve ─────────────────────────────────────────
// Approve a pending student / university account.
const approveUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await User.findById(userId);
  if (!user) return sendNotFound(res, 'User');

  if (user.isActive === true) {
    return sendError(res, 'User is already active/approved.', 400);
  }

  const updated = await User.update(userId, { isActive: true });

  await AuditLog.create({
    action:     'USER_APPROVED',
    actorId:    req.user.id,
    actorRole:  req.user.role,
    targetId:   userId,
    targetType: 'user',
    details:    { email: user.email, role: user.role },
    ipAddress:  req.ip,
  });

  const { passwordHash: _drop, ...safeUser } = updated;
  return sendSuccess(res, { user: safeUser }, 'User approved successfully');
});

// ─── PATCH /api/v1/users/:id/reject ──────────────────────────────────────────
// Reject and deactivate a pending account.
const rejectUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await User.findById(userId);
  if (!user) return sendNotFound(res, 'User');

  if (user.isActive === false) {
    return sendError(res, 'User is already inactive/rejected.', 400);
  }

  const updated = await User.update(userId, { isActive: false });

  await AuditLog.create({
    action:     'USER_REJECTED',
    actorId:    req.user.id,
    actorRole:  req.user.role,
    targetId:   userId,
    targetType: 'user',
    details:    { email: user.email, role: user.role, reason: req.body?.reason || null },
    ipAddress:  req.ip,
  });

  const { passwordHash: _drop, ...safeUser } = updated;
  return sendSuccess(res, { user: safeUser }, 'User rejected');
});

module.exports = {
  getUsers,
  getUserById,   // FIX 1
  updateUser,    // FIX 2
  deleteUser,    // FIX 3
  approveUser,
  rejectUser,
};