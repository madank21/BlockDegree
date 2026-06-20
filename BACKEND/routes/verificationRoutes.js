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

// --- Ensure all imported middleware are functions -----------------------------
if (typeof optionalAuthenticate !== 'function') {
  throw new Error(
    '❌ optionalAuthenticate is not a function. ' +
    'Check that authMiddleware exports it correctly.'
  );
}
if (typeof authenticate !== 'function') {
  throw new Error(
    '❌ authenticate is not a function. ' +
    'Check that authMiddleware exports it correctly.'
  );
}
if (typeof authorize !== 'function') {
  throw new Error(
    '❌ authorize is not a function. ' +
    'Check that roleMiddleware exports it correctly.'
  );
}

// --- Ensure validators are arrays (for spread) -------------------------------
const uuidValidator = uuidParamValidator(); // returns an array of middlewares
if (!Array.isArray(uuidValidator)) {
  throw new Error('uuidParamValidator must return an array of middleware.');
}

// ─── Public Routes ─────────────────────────────────────────────────────────────
router.get('/public/:hash', verifyDegreePublic);
router.get('/code/:code', getVerificationByCode);

// ─── Protected Routes ──────────────────────────────────────────────────────────
router.use(optionalAuthenticate);

router.post('/', verificationCreateValidators, requestVerification);

router.use(authenticate);

router.get('/', paginationValidators, getAllVerifications);
router.get('/stats', getVerificationStats);
router.get('/:id', ...uuidValidator, getVerificationById);
router.post('/:id/retrigger',
  authorize('admin', 'university'),
  ...uuidValidator,
  retriggerVerification
);

module.exports = router;