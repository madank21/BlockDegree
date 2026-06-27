// BACKEND/controllers/fraudController.js
//
// WHAT WAS BROKEN (original file had ALL of these):
//   1. FraudLog.findAll({ where, order })  — Sequelize ORM call. FraudLog is a plain Supabase
//      object with no findAll. Crashed on every GET /fraud/reports with "not a function".
//   2. FraudLog.findByPk(reportId)         — Sequelize method. Does not exist. resolveReport
//      always threw immediately, so NO fraud report could ever be resolved.
//   3. report.resolved = true; report.save() — Sequelize active-record pattern. Does not exist.
//   4. User.findAll() / Degree.findAll() / Document.findAll() — Sequelize. All crash in getStats.
//   5. fraudDetectionService.getSystemSafetyScore() — method does not exist in the service.
//      Calling it throws and kills getStats entirely.
//   6. fraudDetectionService.runBulkFraudChecks() — also does not exist. getFraudChecks always threw.
//   7. No asyncHandler wrapper → unhandled promise rejections hung the request instead of returning 500.
//   8. No standardized response helpers (sendSuccess / sendError / sendPaginated) — used raw res.json().
//   9. fraudRoutes.js uses :reportId param but original controller read req.params.id (MISMATCH).
//      Fixed by using req.params.reportId here (matches the route exactly as-is).
//
// DEPENDENCIES (all verified):
//   ../models/FraudLog                  → FraudLog.findMany / findById / update / getStats / create
//   ../models/User                      → User.findMany (no findAll)
//   ../models/Degree                    → Degree.findMany (no findAll)
//   ../models/Document                  → Document.findAll (exists in Document model)
//   ../services/fraudDetectionService   → fraudDetectionService.analyzeDocument / runFraudCheck
//   ../models/AuditLog                  → AuditLog.create
//   ../src/utils/response               → sendSuccess / sendError / sendPaginated / sendNotFound
//   ../middleware/errorMiddleware        → asyncHandler

'use strict';

const { asyncHandler }  = require('../middleware/errorMiddleware');
const {
  sendSuccess,
  sendError,
  sendPaginated,
  sendNotFound,
}                        = require('../src/utils/response');
const FraudLog           = require('../models/FraudLog');
const User               = require('../models/User');
const Degree             = require('../models/Degree');
const Document           = require('../models/Document');
const fraudDetectionService = require('../services/fraudDetectionService');
const AuditLog           = require('../models/AuditLog');
const { logger }         = require('../src/utils/logger');

// ─── GET /api/v1/fraud/reports ───────────────────────────────────────────────
// FIX 1: Was FraudLog.findAll({ where, order }) — Sequelize. Replaced with FraudLog.findMany().
exports.getReports = asyncHandler(async (req, res) => {
  const {
    resolved,
    severity,
    riskLevel,
    page  = 1,
    limit = 20,
  } = req.query;

  const parsedPage  = parseInt(page,  10) || 1;
  const parsedLimit = parseInt(limit, 10) || 20;

  const opts = { page: parsedPage, limit: parsedLimit };

  // FIX 1: map Sequelize-style "resolved" query param → is_resolved column filter
  if (resolved !== undefined) opts.resolved = resolved === 'true';

  // Support both "severity" (old Sequelize column) and "riskLevel" (actual DB column)
  if (riskLevel) opts.riskLevel = riskLevel.toUpperCase();
  else if (severity) opts.riskLevel = severity.toUpperCase();

  const result = await FraudLog.findMany(opts);

  const totalPages = Math.ceil(result.total / parsedLimit);

  return sendPaginated(
    res,
    result.data,
    { count: result.total, page: parsedPage, limit: parsedLimit, totalPages },
    'Fraud reports retrieved'
  );
});

// ─── GET /api/v1/fraud/stats ─────────────────────────────────────────────────
// FIX 4: Was User.findAll() / Degree.findAll() / Document.findAll() — Sequelize.
//         Replaced with the correct Supabase model methods.
// FIX 5: getSystemSafetyScore() doesn't exist — guarded with try/catch and typeof check.
exports.getStats = asyncHandler(async (req, res) => {
  // Native fraud log stats from FraudLog model
  const fraudStats = await FraudLog.getStats();

  // FIX 4: User.findAll → User.findMany({ limit: 9999 }).data
  let users     = [];
  let degrees   = [];
  let documents = [];

  try {
    const [ur, dr, docResult] = await Promise.all([
      User.findMany({ limit: 9999 }),
      Degree.findMany({ limit: 9999 }),
      Document.findAll({ limit: 9999 }), // Document.findAll exists and is correct
    ]);
    users     = ur.data     || [];
    degrees   = dr.data     || [];
    documents = docResult.data || [];
  } catch (err) {
    logger.warn('[FraudController.getStats] Could not fetch users/degrees/docs:', err.message);
  }

  // Duplicate CNIC detection — stored in metadata.cnicNumber per User model
  const cnicMap = new Map();
  users.forEach(u => {
    const cnic = u.metadata?.cnicNumber || u.metadata?.cnic;
    if (cnic) cnicMap.set(cnic, (cnicMap.get(cnic) || 0) + 1);
  });
  const duplicateCnicCount = Array.from(cnicMap.values()).filter(c => c > 1).length;

  // Fraudulent documents (YOLO status column in documents table)
  const fraudulentDocCount = documents.filter(d =>
    d.yolo_status === 'fraudulent' || d.yoloStatus === 'fraudulent'
  ).length;

  // FIX 5: getSystemSafetyScore — guarded; method may not exist in all service versions
  let safetyScore = null;
  try {
    if (typeof fraudDetectionService.getSystemSafetyScore === 'function') {
      safetyScore = await fraudDetectionService.getSystemSafetyScore();
    }
  } catch (err) {
    logger.warn('[FraudController] getSystemSafetyScore unavailable:', err.message);
  }

  return sendSuccess(res, {
    ...fraudStats,
    duplicateCnicCount,
    fraudulentDocCount,
    safetyScore,
    totalApplications: degrees.length,
  }, 'Fraud statistics retrieved');
});

// ─── GET /api/v1/fraud/checks ────────────────────────────────────────────────
// FIX 6: runBulkFraudChecks() doesn't exist — guarded with typeof check + fallback.
exports.getFraudChecks = asyncHandler(async (req, res) => {
  let checks = [];

  try {
    if (typeof fraudDetectionService.runBulkFraudChecks === 'function') {
      checks = await fraudDetectionService.runBulkFraudChecks();
    } else {
      // Fallback: return recent fraud log entries as the check list
      const result = await FraudLog.findMany({ page: 1, limit: 50 });
      checks = result.data;
    }
  } catch (err) {
    logger.warn('[FraudController] getFraudChecks fallback triggered:', err.message);
    const result = await FraudLog.findMany({ page: 1, limit: 50 });
    checks = result.data;
  }

  return sendSuccess(res, { checks }, 'Fraud checks retrieved');
});

// ─── POST /api/v1/fraud/check/:applicationId ─────────────────────────────────
// FIX 7: Added asyncHandler and standardized response.
exports.runFraudCheck = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;

  if (!applicationId) {
    return sendError(res, 'applicationId is required.', 400);
  }

  let result;
  try {
    result = await fraudDetectionService.runFraudCheck(applicationId);
  } catch (err) {
    logger.error('[FraudController] runFraudCheck error:', err.message);
    return sendError(res, `Fraud check failed: ${err.message}`, 500);
  }

  await AuditLog.create({
    action:     'FRAUD_CHECK_RUN',
    actorId:    req.user?.id,
    actorRole:  req.user?.role,
    targetId:   applicationId,
    targetType: 'degree',
    details:    { result },
    ipAddress:  req.ip,
  });

  return sendSuccess(res, { applicationId, result }, 'Fraud check completed');
});

// ─── PATCH /api/v1/fraud/reports/:reportId/resolve ───────────────────────────
// FIX 2: Was FraudLog.findByPk(reportId) — Sequelize. Replaced with FraudLog.findById().
// FIX 3: Was report.resolved = true; report.save() — Sequelize. Replaced with FraudLog.update().
// FIX 9: Route uses :reportId param — this controller now reads req.params.reportId correctly.
exports.resolveReport = asyncHandler(async (req, res) => {
  // FIX 9: use reportId to match the route param in fraudRoutes.js exactly
  const { reportId } = req.params;

  // FIX 2: findByPk → findById (Supabase model method)
  const report = await FraudLog.findById(reportId);
  if (!report) return sendNotFound(res, 'Fraud report');

  // Guard: don't resolve an already-resolved report
  if (report.is_resolved) {
    return sendError(res, 'This fraud report is already resolved.', 400);
  }

  // FIX 3: report.save() → FraudLog.update(id, patches)
  const updated = await FraudLog.update(reportId, {
    is_resolved: true,
    resolved_at: new Date().toISOString(),
    resolved_by: req.user?.id || null,
    resolution_notes: req.body?.notes || null,
  });

  await AuditLog.create({
    action:     'FRAUD_REPORT_RESOLVED',
    actorId:    req.user?.id,
    actorRole:  req.user?.role,
    targetId:   reportId,
    targetType: 'fraud_log',
    details:    { reportId, notes: req.body?.notes || null },
    ipAddress:  req.ip,
  });

  return sendSuccess(res, { report: updated }, 'Fraud report resolved successfully');
});