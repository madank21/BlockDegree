// BACKEND/controllers/fraudController.js
//
// FIXES applied (verified directly against current FRONTEND/src/pages/FraudDetection.tsx):
//   FIX-1: getReports/getFraudChecks now return RAW ARRAYS (res.json(array)),
//          not { success, data: { reports: [...] } }. FraudDetection.tsx does
//          `Array.isArray(reportsRaw) ? reportsRaw : []` — wrapping the array
//          in an object made every list render empty.
//   FIX-2: getStats() now returns the EXACT field names FraudStats expects:
//          unresolvedCount, resolvedCount, highCount, mediumCount, lowCount,
//          duplicateCnicCount, fraudulentDocCount, safetyScore, totalApplications.
//          The previous version returned fraudLogs/totalUsers/totalDegrees/etc,
//          none of which the page reads.
//   FIX-3: getReports no longer filters is_fraudulent when the caller passes
//          ?resolved=true|false — that was filtering the wrong column. Now
//          passes `resolved` straight through to FraudLog (which maps it to
//          is_resolved).
//   FIX-4: resolveReport now updates is_resolved/resolved_at/resolved_by
//          (real columns — see migration 003) instead of overloading
//          is_fraudulent, which conflates "false positive" with "reviewed".
//   FIX-5: studentName is now resolved via the linked degree for both
//          getReports and getFraudChecks.

const FraudLog = require('../models/FraudLog');
const User = require('../models/User');
const Degree = require('../models/Degree');
const Document = require('../models/Document');
const { getSupabaseAdmin } = require('../database/supabase');

const ALL_ROWS_LIMIT = 100000;

// Map this app's risk_level (MINIMAL/LOW/MEDIUM/HIGH/CRITICAL) onto the
// 'high' | 'medium' | 'low' | 'safe' severity scale FraudDetection.tsx renders.
function riskLevelToSeverity(riskLevel) {
  switch (riskLevel) {
    case 'CRITICAL':
    case 'HIGH':
      return 'high';
    case 'MEDIUM':
      return 'medium';
    case 'LOW':
      return 'low';
    default:
      return 'safe';
  }
}

// Best-effort studentName lookup for a batch of FraudLog rows via their
// linked degree_id (fraud logs aren't guaranteed to have one yet).
async function attachStudentNames(rows) {
  const degreeIds = [...new Set(rows.map((r) => r.degree_id).filter(Boolean))];
  if (!degreeIds.length) return rows.map((r) => ({ ...r, studentName: 'Unknown' }));

  const degrees = await Promise.all(degreeIds.map((id) => Degree.findById(id)));
  const degreeMap = new Map(degreeIds.map((id, i) => [id, degrees[i]]));

  return rows.map((r) => ({
    ...r,
    studentName: r.degree_id ? (degreeMap.get(r.degree_id)?.studentName || 'Unknown') : 'Unknown',
  }));
}

// ── GET /api/v1/fraud/reports ─────────────────────────────────────────────────
// FIX-1: returns a raw array. FIX-3: `resolved` is passed straight through.
exports.getReports = async (req, res) => {
  try {
    const {
      resolved,
      riskLevel,
      severity, // alias
      page = 1,
      limit = 50,
    } = req.query;

    const result = await FraudLog.findMany({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      resolved: resolved !== undefined ? resolved === 'true' : undefined,
      riskLevel: (riskLevel || severity) ? (riskLevel || severity).toUpperCase() : undefined,
    });

    const withNames = await attachStudentNames(result.data);

    const reports = withNames.map((log) => ({
      id: log.id,
      type: (log.findings && log.findings[0]) || 'Document Fraud Check',
      description:
        log.findings && log.findings.length
          ? log.findings.join('; ')
          : 'Automated fraud analysis flagged this document for review.',
      severity: riskLevelToSeverity(log.risk_level),
      riskLevel: log.risk_level,
      studentName: log.studentName,
      timestamp: log.created_at,
      createdAt: log.created_at,
      resolved: !!log.is_resolved,
      isFraudulent: log.is_fraudulent,
      fraudScore: log.fraud_score,
      findings: log.findings || [],
    }));

    res.json(reports);
  } catch (err) {
    console.error('[Fraud] getReports error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET /api/v1/fraud/stats ───────────────────────────────────────────────────
// FIX-2: exact field names FraudDetection.tsx's FraudStats interface expects.
exports.getStats = async (req, res) => {
  try {
    const fraudStats = await FraudLog.getStats();

    const [{ data: students }, degreeStats] = await Promise.all([
      User.findMany({ page: 1, limit: ALL_ROWS_LIMIT, role: 'student' }),
      Degree.getStats(),
    ]);

    // No CNIC field exists anywhere in this schema. The closest real signal
    // for "duplicate accounts" available is more than one student account
    // sharing the same student_id.
    const studentIdCounts = new Map();
    students.forEach((s) => {
      if (s.studentId) studentIdCounts.set(s.studentId, (studentIdCounts.get(s.studentId) || 0) + 1);
    });
    const duplicateCnicCount = [...studentIdCounts.values()].filter((c) => c > 1).length;

    const supabase = getSupabaseAdmin();
    const { count: fraudulentDocCount } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .gt('fraud_score', 0.7);

    const safetyScore = Math.max(
      0,
      Math.min(
        100,
        100 - fraudStats.critical * 20 - fraudStats.high * 10 - (fraudulentDocCount || 0) * 5
      )
    );

    res.json({
      unresolvedCount: fraudStats.unresolved || 0,
      resolvedCount: fraudStats.resolved || 0,
      highCount: (fraudStats.critical || 0) + (fraudStats.high || 0),
      mediumCount: fraudStats.medium || 0,
      lowCount: fraudStats.low || 0,
      duplicateCnicCount,
      fraudulentDocCount: fraudulentDocCount || 0,
      safetyScore,
      totalApplications: degreeStats.total || 0,
    });
  } catch (err) {
    console.error('[Fraud] getStats error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET /api/v1/fraud/checks ──────────────────────────────────────────────────
// FIX-1: raw array. FIX-5: studentName resolved via the linked degree.
exports.getFraudChecks = async (req, res) => {
  try {
    const { page = 1, limit = 50, minScore } = req.query;

    const result = await Document.findAll({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      fraudScoreMin: minScore ? parseFloat(minScore) : null,
    });

    const degreeIds = [...new Set(result.data.map((d) => d.degree_id).filter(Boolean))];
    const degrees = await Promise.all(degreeIds.map((id) => Degree.findById(id)));
    const degreeMap = new Map(degreeIds.map((id, i) => [id, degrees[i]]));

    const checks = result.data.map((doc) => {
      const fraudScore = doc.fraud_score || 0;
      const severity = fraudScore >= 0.6 ? 'high' : fraudScore >= 0.3 ? 'medium' : 'safe';
      const degree = doc.degree_id ? degreeMap.get(doc.degree_id) : null;

      return {
        applicationId: doc.degree_id || doc.id,
        studentName: degree?.studentName || 'Unknown',
        fraudScore,
        severity,
        flags: doc.validation_errors || [],
      };
    });

    res.json(checks);
  } catch (err) {
    console.error('[Fraud] getFraudChecks error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── POST /api/v1/fraud/check/:applicationId ───────────────────────────────────
// applicationId is a Degree ID — runs a lightweight in-line fraud assessment
// over every document linked to that degree.
exports.runFraudCheck = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const degree = await Degree.findById(applicationId);
    if (!degree) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const supabase = getSupabaseAdmin();
    const { data: docs } = await supabase
      .from('documents')
      .select('id, fraud_score, yolo_status, ocr_confidence, is_verified')
      .eq('degree_id', applicationId);

    const documents = docs || [];
    const avgFraud = documents.length
      ? documents.reduce((s, d) => s + (d.fraud_score || 0), 0) / documents.length
      : 0;

    const riskLevel =
      avgFraud >= 0.8 ? 'CRITICAL' :
      avgFraud >= 0.6 ? 'HIGH' :
      avgFraud >= 0.4 ? 'MEDIUM' :
      avgFraud >= 0.2 ? 'LOW' : 'MINIMAL';

    const result = {
      applicationId,
      degreeId: degree.id,
      studentName: degree.studentName,
      fraudScore: parseFloat(avgFraud.toFixed(4)),
      riskLevel,
      documentsChecked: documents.length,
      isFraudulent: avgFraud >= 0.8,
    };

    if (avgFraud >= 0.6) {
      await FraudLog.create({
        degreeId: applicationId,
        fraudScore: avgFraud,
        riskLevel,
        isFraudulent: avgFraud >= 0.8,
        findings: [`Automated check: average fraud score ${avgFraud.toFixed(2)}`],
        reportedBy: req.user?.id || null,
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Fraud] runFraudCheck error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── PATCH /api/v1/fraud/reports/:reportId/resolve ────────────────────────────
// FIX-4: resolves via is_resolved/resolved_at/resolved_by, not is_fraudulent.
exports.resolveReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    const existing = await FraudLog.findById(reportId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Fraud report not found' });
    }

    const updated = await FraudLog.update(reportId, {
      resolved: true,
      resolvedAt: new Date().toISOString(),
      resolved_by: req.user?.id || null,
    });

    res.json({
      success: true,
      data: { message: 'Fraud report resolved successfully', report: updated },
    });
  } catch (err) {
    console.error('[Fraud] resolveReport error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};