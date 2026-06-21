const asyncHandler = require('express-async-handler');
const AuditLog = require('../models/AuditLog');
const { sendPaginated } = require('../src/utils/response');

// GET /api/v1/audit-logs
const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, action, userId, startDate, endDate } = req.query;

  const filters = {};
  if (action) filters.action = action;
  if (userId) filters.actorId = userId;
  if (startDate || endDate) {
    filters.dateRange = {};
    if (startDate) filters.dateRange.start = new Date(startDate);
    if (endDate) filters.dateRange.end = new Date(endDate);
  }

  // Assuming AuditLog.findMany accepts pagination and filters
  const { data, total } = await AuditLog.findMany({ page, limit, ...filters });
  return sendPaginated(res, data, total, page, limit, 'Audit logs retrieved');
});

module.exports = {
  getAuditLogs,
};