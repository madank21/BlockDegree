const express = require('express');
const router = express.Router();

const {
  issueDegree,
  getDegrees,
  getDegreeById,
  getDegreeQR,
  updateDegree,
  revokeDegree,
  getDegreeStats,
  getPublicCertificate,
  issueExistingDegree,   // ← new controller method
} = require('../controllers/degreeController');

const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { authorize, authorizeUniversityOrAdmin, authorizeAdmin } = require('../middleware/roleMiddleware');
const {
  degreeCreateValidators,
  uuidParamValidator,
  paginationValidators,
} = require('../src/utils/validators');
const { body } = require('express-validator');

// ─── Public Routes ─────────────────────────────────────────────────────────────
router.get('/public/:certNumber', getPublicCertificate);

// ─── Protected Routes ──────────────────────────────────────────────────────────
router.use(authenticate);

router.get('/', paginationValidators, getDegrees);
router.get('/stats', getDegreeStats);
router.get('/:id', ...uuidParamValidator(), getDegreeById);
router.get('/:id/qr', ...uuidParamValidator(), getDegreeQR);

// University and Admin only
router.post('/',
  authorizeUniversityOrAdmin,
  degreeCreateValidators,
  issueDegree
);

// ─── NEW: Issue an existing degree (change status to "issued") ──────────────
router.post('/:id/issue',
  authorizeUniversityOrAdmin,
  ...uuidParamValidator(),
  issueExistingDegree
);

router.patch('/:id',
  authorizeUniversityOrAdmin,
  ...uuidParamValidator(),
  updateDegree
);

router.delete('/:id/revoke',
  authorizeUniversityOrAdmin,
  ...uuidParamValidator(),
  body('reason').isLength({ min: 10 }).withMessage('Reason must be at least 10 characters'),
  revokeDegree
);

module.exports = router;