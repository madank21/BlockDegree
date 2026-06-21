const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeAdmin } = require('../middleware/roleMiddleware');
const { getAuditLogs } = require('../controllers/auditController');
const { paginationValidators } = require('../src/utils/validators');

router.use(authenticate, authorizeAdmin);

// GET /api/v1/audit-logs
router.get('/', paginationValidators, getAuditLogs);

module.exports = router;