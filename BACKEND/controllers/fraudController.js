const FraudLog = require('../models/FraudLog');
const User = require('../models/User');
const Degree = require('../models/Degree');
const Document = require('../models/Document');
const fraudDetectionService = require('../services/fraudDetectionService'); // your existing service

// GET /api/v1/fraud/reports
exports.getReports = async (req, res) => {
  try {
    const { resolved, severity } = req.query;
    const where = {};
    if (resolved !== undefined) where.resolved = resolved === 'true';
    if (severity) where.severity = severity;
    const reports = await FraudLog.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/v1/fraud/stats
exports.getStats = async (req, res) => {
  try {
    const allReports = await FraudLog.findAll();
    const unresolved = allReports.filter(r => !r.resolved);
    const resolved = allReports.filter(r => r.resolved);
    const high = allReports.filter(r => r.severity === 'high');
    const medium = allReports.filter(r => r.severity === 'medium');
    const low = allReports.filter(r => r.severity === 'low');
    // Also compute other stats from DB
    const users = await User.findAll();
    const degrees = await Degree.findAll();
    const documents = await Document.findAll();
    // Duplicate CNIC count
    const cnicMap = new Map();
    users.forEach(u => {
      if (u.cnicNumber) {
        cnicMap.set(u.cnicNumber, (cnicMap.get(u.cnicNumber) || 0) + 1);
      }
    });
    const duplicateCnicCount = Array.from(cnicMap.values()).filter(c => c > 1).length;
    // Fraudulent documents (based on YOLO status)
    const fraudulentDocCount = documents.filter(d => d.yoloStatus === 'fraudulent').length;
    // Additional stats can be computed by calling fraudDetectionService.getSystemSafetyScore()
    const safetyScore = await fraudDetectionService.getSystemSafetyScore(); // you'll need to implement this
    res.json({
      unresolvedCount: unresolved.length,
      resolvedCount: resolved.length,
      highCount: high.length,
      mediumCount: medium.length,
      lowCount: low.length,
      duplicateCnicCount,
      fraudulentDocCount,
      safetyScore,
      totalApplications: degrees.length,
      // other detection category counts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/v1/fraud/checks
exports.getFraudChecks = async (req, res) => {
  try {
    // This can return a list of all applications with their fraud check results
    // You may have a service that pre-computes and caches these
    const checks = await fraudDetectionService.runBulkFraudChecks();
    res.json(checks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/v1/fraud/check/:applicationId
exports.runFraudCheck = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const result = await fraudDetectionService.runFraudCheck(applicationId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/v1/fraud/reports/:reportId/resolve
exports.resolveReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await FraudLog.findByPk(reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    report.resolved = true;
    report.resolvedAt = new Date();
    await report.save();
    res.json({ message: 'Report resolved', report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};