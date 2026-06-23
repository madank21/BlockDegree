// BACKEND/controllers/userController.js
//
// FIXES applied (verified against current BACKEND/models/User.js):
//   FIX-1: Added getUserById  — was entirely missing; usersApi.getById() and
//          userRoutes.js had nothing to call.
//   FIX-2: Added updateUser   — was entirely missing.
//   FIX-3: Added deleteUser   — was entirely missing.
//   FIX-4: getUsers/approveUser kept, but approveUser/rejectUser now use
//          isActive (the real, only, column User.update() recognizes for
//          this purpose) instead of a non-existent "status" field.
//   FIX-5: Every handler strips passwordHash before sending a user object
//          back to the client (User.findById/update/delete all return it).

'use strict';

const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess, sendError, sendNotFound } = require('../src/utils/response');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

function stripPassword(user) {
  if (!user) return user;
  const { passwordHash, ...safe } = user;
  return safe;
}

// ─── GET /api/v1/users ─────────────────────────────────────────────────────────
exports.getUsers = asyncHandler(async (req, res) => {
  const { role, page = 1, limit = 10, search, isActive } = req.query;

  const { data, total } = await User.findMany({
    role: typeof role === 'string' ? role : undefined,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    search: search || undefined,
    isActive:
      isActive === 'true' ? true :
      isActive === 'false' ? false : undefined,
  });

  return sendSuccess(res, {
    users: data.map(stripPassword),
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  }, 'Users retrieved');
});

// ─── GET /api/v1/users/:id ─────────────────────────────────────────────────────
// FIX-1: did not exist before.
exports.getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) return sendNotFound(res, 'User');

  // Non-admins may only read their own record.
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return sendError(res, 'Access denied.', 403);
  }

  return sendSuccess(res, { user: stripPassword(user) }, 'User retrieved');
});

// ─── PATCH /api/v1/users/:id ───────────────────────────────────────────────────
// FIX-2: did not exist before.
exports.updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const target = await User.findById(id);
  if (!target) return sendNotFound(res, 'User');

  // Non-admins may only update their own record.
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return sendError(res, 'Access denied.', 403);
  }

  const body = { ...req.body };

  // Never let this generic endpoint change credentials.
  delete body.password;
  delete body.passwordHash;
  delete body.password_hash;

  // Only admins may change role / active state / institution.
  if (req.user.role !== 'admin') {
    delete body.role;
    delete body.isActive;
    delete body.institutionId;
  }

  if (Object.keys(body).length === 0) {
    return sendError(res, 'No valid fields to update', 400);
  }

  const updated = await User.update(id, body);

  await AuditLog.create({
    action: 'USER_UPDATED',
    actorId: req.user.id,
    actorRole: req.user.role,
    targetId: id,
    targetType: 'user',
    details: { fields: Object.keys(body) },
    ipAddress: req.ip,
  });

  return sendSuccess(res, { user: stripPassword(updated) }, 'User updated successfully');
});

// ─── DELETE /api/v1/users/:id ──────────────────────────────────────────────────
// FIX-3: did not exist before.
exports.deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { hard } = req.query;

  const target = await User.findById(id);
  if (!target) return sendNotFound(res, 'User');

  if (req.user.id === id) {
    return sendError(res, 'You cannot delete your own account.', 400);
  }

  await User.delete(id, hard === 'true');

  await AuditLog.create({
    action: hard === 'true' ? 'USER_DELETED_HARD' : 'USER_DEACTIVATED',
    actorId: req.user.id,
    actorRole: req.user.role,
    targetId: id,
    targetType: 'user',
    details: { email: target.email, role: target.role },
    ipAddress: req.ip,
  });

  return sendSuccess(
    res,
    { message: hard === 'true' ? 'User permanently deleted' : 'User deactivated' },
    hard === 'true' ? 'User permanently deleted' : 'User deactivated'
  );
});

// ─── PATCH /api/v1/users/:id/approve ───────────────────────────────────────────
// FIX-4: users table has no "status" column — User.update()'s field map only
// recognizes isActive for this purpose. Approving == activating.
exports.approveUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) return sendNotFound(res, 'User');

  if (user.isActive) {
    return sendError(res, 'User is already active', 400);
  }

  const updated = await User.update(id, { isActive: true });

  await AuditLog.create({
    action: 'USER_APPROVED',
    actorId: req.user.id,
    actorRole: req.user.role,
    targetId: id,
    targetType: 'user',
    details: { email: user.email, role: user.role },
    ipAddress: req.ip,
  });

  return sendSuccess(res, { user: stripPassword(updated) }, 'User approved and activated');
});

// ─── PATCH /api/v1/users/:id/reject ────────────────────────────────────────────
exports.rejectUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) return sendNotFound(res, 'User');

  const updated = await User.update(id, { isActive: false });

  await AuditLog.create({
    action: 'USER_REJECTED',
    actorId: req.user.id,
    actorRole: req.user.role,
    targetId: id,
    targetType: 'user',
    details: { email: user.email, role: user.role },
    ipAddress: req.ip,
  });

  return sendSuccess(res, { user: stripPassword(updated) }, 'User rejected');
});