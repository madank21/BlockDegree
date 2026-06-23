// BACKEND/controllers/fraudController.js
// ─────────────────────────────────────────────────────────────────────────────
// Fraud Controller — fully rewritten to use Supabase model methods
// (replaces all Sequelize calls: findAll, findByPk, save, findAll on User/Degree/Document)
// ─────────────────────────────────────────────────────────────────────────────

const FraudLog  = require('../models/FraudLog');
const User      = require('../models/User');
const Degree    = require('../models/Degree');
const Document  = require('../models/Document');
const { getSupabaseAdmin } = require('../database/supabase');

// ── GET /api/v1/fraud/reports ─────────────────────────────────────────────────
// Query params: resolved (bool), severity/riskLevel (string), page, limit
exports.getReports = async (req, res) => {
  try {
    const {
      resolved,
      riskLevel,
      severity,   // alias
      page  = 1,
      limit = 20,
    } = req.query;

    const filters = {};
    if (resolved !== undefined) {
      filters.isFraudulent = resolved === 'true';
    }
    if (riskLevel || severity) {
      filters.riskLevel = (riskLevel || severity).toUpperCase();
    }

    const result = await FraudLog.findMany({
      ...filters,
      page:  parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: {
        reports: result.data,
        total:   result.total,
        page:    parseInt(page),
        limit:   parseInt(limit),
      },
    });
  } catch (err) {
    console.error('[Fraud] getReports error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET /api/v1/fraud/stats ───────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    // FraudLog stats from model
    const fraudStats = await FraudLog.getStats();

    // User, Degree, Document counts via Supabase model methods
    const [userCount, degreeStats, docResult] = await Promise.all([
      User.count(),
      Degree.getStats(),
      Document.findAll({ page: 1, limit: 1 }),
    ]);

    // Count fraudulent documents via supabase
    const supabase = getSupabaseAdmin();
    const { count: fraudDocCount } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .gt('fraud_score', 0.7);

    // Simple safety score: 100 minus weighted fraud indicators
    const safetyScore = Math.max(
      0,
      100 -
        fraudStats.critical * 20 -
        fraudStats.high * 10 -
        (fraudDocCount || 0) * 5
    );

    res.json({
      success: true,
      data: {
        fraudLogs: fraudStats,
        totalUsers:       userCount,
        totalDegrees:     degreeStats.total,
        totalDocuments:   docResult.total,
        fraudulentDocs:   fraudDocCount || 0,
        safetyScore:      Math.min(100, safetyScore),
      },
    });
  } catch (err) {
    console.error('[Fraud] getStats error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET /api/v1/fraud/checks ──────────────────────────────────────────────────
// Returns a paginated list of documents with their fraud scores for review.
exports.getFraudChecks = async (req, res) => {
  try {
    const { page = 1, limit = 20, minScore } = req.query;

    const result = await Document.findAll({
      page:          parseInt(page),
      limit:         parseInt(limit),
      fraudScoreMin: minScore ? parseFloat(minScore) : null,
    });

    // Map to a fraud-check shape expected by the frontend
    const checks = result.data.map((doc) => ({
      id:            doc.id,
      documentId:    doc.id,
      fileName:      doc.original_name || doc.file_name,
      documentType:  doc.document_type,
      fraudScore:    doc.fraud_score || 0,
      ocrConfidence: doc.ocr_confidence || 0,
      yoloValid:     doc.yolo_valid,
      yoloStatus:    doc.yolo_status,
      isVerified:    doc.is_verified,
      userId:        doc.user_id,
      degreeId:      doc.degree_id,
      createdAt:     doc.created_at,
    }));

    res.json({
      success: true,
      data: {
        checks,
        total: result.total,
        page:  parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    console.error('[Fraud] getFraudChecks error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── POST /api/v1/fraud/check/:applicationId ───────────────────────────────────
// Runs a lightweight in-line fraud assessment for a specific document/degree.
exports.runFraudCheck = async (req, res) => {
  try {
    const { applicationId } = req.params;

    // Look up degree first, then documents attached to it
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
    const avgFraud  = documents.length
      ? documents.reduce((s, d) => s + (d.fraud_score || 0), 0) / documents.length
      : 0;

    const riskLevel =
      avgFraud >= 0.8 ? 'CRITICAL' :
      avgFraud >= 0.6 ? 'HIGH'     :
      avgFraud >= 0.4 ? 'MEDIUM'   :
      avgFraud >= 0.2 ? 'LOW'      : 'MINIMAL';

    const result = {
      applicationId,
      degreeId:       degree.id,
      studentName:    degree.studentName,
      fraudScore:     parseFloat(avgFraud.toFixed(4)),
      riskLevel,
      documentsChecked: documents.length,
      isFraudulent:   avgFraud >= 0.8,
    };

    // Persist a fraud log entry if risk is high
    if (avgFraud >= 0.6) {
      await FraudLog.create({
        degreeId:     applicationId,
        fraudScore:   avgFraud,
        riskLevel,
        isFraudulent: avgFraud >= 0.8,
        findings:     [`Automated check: average fraud score ${avgFraud.toFixed(2)}`],
        reportedBy:   req.user?.id || null,
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Fraud] runFraudCheck error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── PATCH /api/v1/fraud/reports/:reportId/resolve ────────────────────────────
exports.resolveReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    const supabase = getSupabaseAdmin();

    // Check the record exists first
    const { data: existing, error: findErr } = await supabase
      .from('fraud_logs')
      .select('id, is_fraudulent')
      .eq('id', reportId)
      .single();

    if (findErr || !existing) {
      return res.status(404).json({ success: false, error: 'Fraud report not found' });
    }

    // Mark as resolved by setting is_fraudulent = false and adding a resolved_at note in findings
    const { data: updated, error: updateErr } = await supabase
      .from('fraud_logs')
      .update({
        is_fraudulent: false,
        findings: [`Resolved by admin (${new Date().toISOString()})`],
      })
      .eq('id', reportId)
      .select('*')
      .single();

    if (updateErr) throw new Error(updateErr.message);

    res.json({
      success: true,
      data: {
        message: 'Fraud report resolved successfully',
        report:  updated,
      },
    });
  } catch (err) {
    console.error('[Fraud] resolveReport error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};