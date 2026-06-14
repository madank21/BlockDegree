const express = require('express');
const router = express.Router();

const {
  requestVerification,
  getVerificationByCode,
  getVerificationById,
  getAllVerifications,
  verifyDegreePublic,
  getVerificationStats,
  retriggerVerification,
} = require('../controllers/verificationController');

const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  verificationCreateValidators,
  uuidParamValidator,
  paginationValidators,
} = require('../src/utils/validators');

// ─── Public Routes ─────────────────────────────────────────────────────────────
router.get('/public/:hash', verifyDegreePublic);
router.get('/code/:code', getVerificationByCode);

// ─── Protected Routes ──────────────────────────────────────────────────────────
router.use(optionalAuthenticate);

router.post('/', verificationCreateValidators, requestVerification);

router.use(authenticate);

router.get('/', paginationValidators, getAllVerifications);
router.get('/stats', getVerificationStats);
router.get('/:id', ...uuidParamValidator(), getVerificationById);
router.post('/:id/retrigger',
  authorize('admin', 'university'),
  ...uuidParamValidator(),
  retriggerVerification
);

module.exports = router;