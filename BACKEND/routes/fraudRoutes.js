const express = require('express');
const router = express.Router();
const fraudController = require('../controllers/fraudController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All fraud routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Get all fraud reports (with optional filters)
router.get('/reports', fraudController.getReports);

// Get aggregated fraud statistics (unresolved count, resolved, severity breakdown, etc.)
router.get('/stats', fraudController.getStats);

// Get fraud checks for all applications (or a specific one)
router.get('/checks', fraudController.getFraudChecks);

// Run fraud check on a specific degree application (e.g., POST /api/v1/fraud/check/:applicationId)
router.post('/check/:applicationId', fraudController.runFraudCheck);

// Resolve a fraud report
router.patch('/reports/:reportId/resolve', fraudController.resolveReport);

module.exports = router;