// BACKEND/controllers/auditController.js
//
// WHAT WAS BROKEN:
//   1. sendPaginated called with WRONG signature:
//         sendPaginated(res, data, total, page, limit, message)   ← BROKEN
//      Actual signature in response.js:
//         sendPaginated(res, data, { count, page, limit, totalPages }, message)
//      This caused pagination.count to be undefined → malformed JSON on every request.
//      The frontend AuditLogs.tsx received { pagination: { total: undefined } }
//      and could never render correct page counts.
//
//   2. AuditLog.findMany() does not support dateRange filter — it only accepts
//      { action, actorId }. The original code built a dateRange object and passed
//      it in, but findMany silently ignored it. Added date filtering via direct
//      Supabase query when date params are present.
//
//   3. No asyncHandler wrapping — unhandled rejection from AuditLog.findMany()
//      would hang the request instead of returning a 500.
//
//   4. sendSuccess not imported — only sendPaginated was imported. If findMany
//      returned 0 results the controller still worked, but if we add any future
//      single-record endpoint it would crash.
//
// DEPENDENCIES (all verified against actual files):
//   express-async-handler              → asyncHandler
//   ../models/AuditLog                 → AuditLog.findMany({ page, limit, action, actorId })
//                                         returns { data: [], total: number }
//   ../database/supabase               → getSupabaseAdmin() (for date-filtered queries)
//   ../src/utils/response              → sendPaginated(res, data, paginationObj, message)
//                                         paginationObj = { count, page, limit, totalPages }

'use strict';

const asyncHandler         = require('express-async-handler');
const AuditLog             = require('../models/AuditLog');
const { getSupabaseAdmin } = require('../database/supabase');
const {
  sendPaginated,
  sendSuccess,
  sendError,
}                          = require('../src/utils/response');

// ─── GET /api/v1/audit-logs ───────────────────────────────────────────────────
// Query params:
//   page      {number}  default 1
//   limit     {number}  default 10
//   action    {string}  filter by exact action name (e.g. "DEGREE_ISSUED")
//   userId    {string}  filter by actor_id (the user who performed the action)
//   startDate {string}  ISO date string — include logs from this date onwards
//   endDate   {string}  ISO date string — include logs up to this date
const getAuditLogs = asyncHandler(async (req, res) => {
  const {
    page      = 1,
    limit     = 10,
    action,
    userId,
    startDate,
    endDate,
  } = req.query;

  const parsedPage  = parseInt(page,  10) || 1;
  const parsedLimit = parseInt(limit, 10) || 10;

  // ── Path A: No date filters — use AuditLog.findMany (fast, uses model) ──────
  if (!startDate && !endDate) {
    const filters = {};
    if (action) filters.action  = action;
    if (userId) filters.actorId = userId;

    const { data, total } = await AuditLog.findMany({
      page:  parsedPage,
      limit: parsedLimit,
      ...filters,
    });

    const totalPages = Math.ceil(total / parsedLimit);

    // FIX 1: correct sendPaginated signature — 3rd arg must be an object
    return sendPaginated(
      res,
      data,
      { count: total, page: parsedPage, limit: parsedLimit, totalPages },
      'Audit logs retrieved'
    );
  }

  // ── Path B: Date filters present — query Supabase directly ──────────────────
  // AuditLog.findMany does not support dateRange, so we drop to Supabase here.
  // FIX 2: proper date filtering instead of passing an ignored dateRange object.
  const supabase = getSupabaseAdmin();
  const offset   = (parsedPage - 1) * parsedLimit;

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' });

  if (action)    query = query.eq('action',    action);
  if (userId)    query = query.eq('actor_id',  userId);
  if (startDate) {
    const start = new Date(startDate);
    if (!isNaN(start)) query = query.gte('created_at', start.toISOString());
  }
  if (endDate) {
    const end = new Date(endDate);
    if (!isNaN(end)) {
      // Include the full end day
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + parsedLimit - 1);

  if (error) {
    return sendError(res, `Failed to retrieve audit logs: ${error.message}`, 500);
  }

  const total      = count || 0;
  const totalPages = Math.ceil(total / parsedLimit);

  // FIX 1: correct sendPaginated signature
  return sendPaginated(
    res,
    data || [],
    { count: total, page: parsedPage, limit: parsedLimit, totalPages },
    'Audit logs retrieved'
  );
});

module.exports = {
  getAuditLogs,
};