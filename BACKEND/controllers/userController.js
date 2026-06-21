const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { sendSuccess, sendPaginated, sendNotFound, sendError } = require('../src/utils/response');
const { logger } = require('../src/utils/logger');

// GET /api/v1/users
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role, status, search } = req.query;
  
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) filter.search = search;

  // Assuming User.findMany accepts pagination and filters
  const { data, total } = await User.findMany({ page, limit, ...filter });
  return sendPaginated(res, data, total, page, limit, 'Users retrieved');
});

// PATCH /api/v1/users/:id/approve
const approveUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const user = await User.findById(userId);
  if (!user) return sendNotFound(res, 'User');

  // If already approved/active, reject gracefully
  if (user.status === 'approved' || user.status === 'active') {
    return sendError(res, 'User is already approved', 400);
  }

  const updated = await User.update(userId, { status: 'approved' });

  await AuditLog.create({
    action: 'USER_APPROVED',
    actorId: req.user.id,
    actorRole: req.user.role,
    targetId: userId,
    targetType: 'user',
    details: { email: user.email, role: user.role },
    ipAddress: req.ip,
  });

  return sendSuccess(res, { user: updated }, 'User approved successfully');
});

// PATCH /api/v1/users/:id/reject
const rejectUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const user = await User.findById(userId);
  if (!user) return sendNotFound(res, 'User');

  if (user.status === 'rejected') {
    return sendError(res, 'User is already rejected', 400);
  }

  const updated = await User.update(userId, { status: 'rejected' });

  await AuditLog.create({
    action: 'USER_REJECTED',
    actorId: req.user.id,
    actorRole: req.user.role,
    targetId: userId,
    targetType: 'user',
    details: { email: user.email, role: user.role },
    ipAddress: req.ip,
  });

  return sendSuccess(res, { user: updated }, 'User rejected');
});

module.exports = {
  getUsers,
  approveUser,
  rejectUser,
};