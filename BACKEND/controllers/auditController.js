// BACKEND/controllers/auditController.js
//
// FIXES applied (verified against current FRONTEND/src/pages/AuditLogs.tsx):
//   FIX-1: AuditLog rows come back as raw snake_case columns with `details`
//          as a JSONB object (e.g. { fields: [...] } or { degree_id, ... }).
//          AuditLogs.tsx's interface expects `details` to be a STRING, and
//          calls `log.details.toLowerCase()` in its search filter — calling
//          .toLowerCase() on a plain object throws a TypeError, so typing
//          anything into the search box crashed the whole page. Details is
//          now serialized to a short readable string in the controller.
//   FIX-2: AuditLogs.tsx also expects `category` and `userName` fields that
//          don't exist on the raw row at all — category is derived from the
//          action name, userName is resolved via a User lookup (deduped
//          across the page so it's at most one query per unique actor, not
//          one per row).
//   FIX-3: asyncHandler now imported from '../middleware/errorMiddleware'
//          (this codebase's actual convention) instead of the
//          'express-async-handler' package, which is not a dependency here.
//   FIX-4: AuditLog.findMany's dateRange filter is accepted by the
//          controller's query params but was never actually applied to the
//          query — wired it through.

const { asyncHandler } = require('../middleware/errorMiddleware');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { sendPaginated } = require('../src/utils/response');
const { getSupabaseAdmin } = require('../database/supabase');

// Best-effort action → UI category mapping, matching the filter chips
// AuditLogs.tsx renders: auth | verification | degree | blockchain | fraud | admin
function categorizeAction(action = '') {
  const a = action.toUpperCase();
  if (a.includes('LOGIN') || a.includes('LOGOUT') || a.includes('REGISTER') || a.includes('PASSWORD') || a.includes('EMAIL_VERIF')) {
    return 'auth';
  }
  if (a.includes('VERIFICATION') || a.includes('VERIFY')) return 'verification';
  if (a.includes('DEGREE')) return 'degree';
  if (a.includes('BLOCKCHAIN') || a.includes('TOKEN') || a.includes('TX_')) return 'blockchain';
  if (a.includes('FRAUD')) return 'fraud';
  if (a.includes('USER_') || a.includes('ADMIN') || a.includes('BACKUP') || a.includes('IMPORT') || a.includes('EXPORT') || a.includes('CLEANUP') || a.includes('RESET')) {
    return 'admin';
  }
  return 'admin';
}

// Turn the JSONB `details` blob into a short, human-readable line instead of
// handing the frontend a raw object it can't safely call string methods on.
function summarizeDetails(details) {
  if (!details) return '';
  if (typeof details === 'string') return details;
  try {
    const entries = Object.entries(details)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
    return entries.join(' · ') || JSON.stringify(details);
  } catch {
    return String(details);
  }
}

// GET /api/v1/audit-logs
const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, action, userId, startDate, endDate } = req.query;

  const filters = {};
  if (action) filters.action = action;
  if (userId) filters.actorId = userId;

  let result;
  if (startDate || endDate) {
    // FIX-4: AuditLog.findMany() has no date-range support, so for this one
    // case query directly rather than silently ignoring the filter.
    const supabase = getSupabaseAdmin();
    let query = supabase.from('audit_logs').select('*', { count: 'exact' });
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.actorId) query = query.eq('actor_id', filters.actorId);
    if (startDate) query = query.gte('created_at', new Date(startDate).toISOString());
    if (endDate) query = query.lte('created_at', new Date(endDate).toISOString());

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit, 10) - 1);

    if (error) throw new Error(`Audit log query failed: ${error.message}`);
    result = { data: data || [], total: count || 0 };
  } else {
    result = await AuditLog.findMany({ page, limit, ...filters });
  }

  // FIX-2: resolve userName per row via the actor's user record, deduped so
  // it's one lookup per unique actor rather than one per row.
  const actorIds = [...new Set(result.data.map((r) => r.actor_id).filter(Boolean))];
  const actors = await Promise.all(actorIds.map((id) => User.findById(id)));
  const actorMap = new Map(actorIds.map((id, i) => [id, actors[i]]));

  const logs = result.data.map((row) => ({
    id: row.id,
    action: row.action,
    details: summarizeDetails(row.details),       // FIX-1
    category: categorizeAction(row.action),        // FIX-2
    userName: row.actor_id ? (actorMap.get(row.actor_id)?.name || 'Unknown') : 'System',
    timestamp: row.created_at,
  }));

  return sendPaginated(res, logs, result.total, page, limit, 'Audit logs retrieved');
});

module.exports = {
  getAuditLogs,
};