const express = require('express');
const rateLimit = require('express-rate-limit');
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
  issueExistingDegree,
  applyForDegree,
  publicLookupById,
} = require('../controllers/degreeController');

const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { authorize, authorizeUniversityOrAdmin, authorizeAdmin } = require('../middleware/roleMiddleware');
const {
  degreeCreateValidators,
  degreeApplyValidators,
  uuidParamValidator,
  paginationValidators,
} = require('../src/utils/validators');
const { body } = require('express-validator');

const blockchainLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Blockchain operation rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Public Routes ─────────────────────────────────────────────────────────────
router.get('/public/cert/:certNumber', getPublicCertificate);
router.get('/public/degree/:id', publicLookupById);   // <-- NEW: public degree lookup by ID

// ─── Protected Routes ──────────────────────────────────────────────────────────
router.use(authenticate);

router.get('/', paginationValidators, getDegrees);
router.get('/stats', getDegreeStats);

// Student degree application (creates pending record)
router.post('/apply',
  authorize('student'),
  degreeApplyValidators,
  applyForDegree
);

router.get('/:id', ...uuidParamValidator(), getDegreeById);
router.get('/:id/qr', ...uuidParamValidator(), getDegreeQR);

// University and Admin only
router.post('/',
  authorizeUniversityOrAdmin,
  blockchainLimiter,
  degreeCreateValidators,
  issueDegree
);

router.post('/:id/issue',
  authorizeUniversityOrAdmin,
  blockchainLimiter,
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