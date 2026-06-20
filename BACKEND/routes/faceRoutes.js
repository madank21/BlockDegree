const express = require('express');
const router = express.Router();

// Import all controller functions (names now match)
const {
  registerFace,
  verifyFace,
  detectFace,
  getFaceStatus,
  deleteFaceDescriptor,
  getFaceVerificationHistory,
  getFaceStats,
} = require('../controllers/faceController');

const { authenticate } = require('../middleware/authMiddleware');
const { uploadFace, handleUploadError } = require('../middleware/uploadMiddleware');
const { paginationValidators } = require('../src/utils/validators');

router.use(authenticate);

// ─── All endpoints ──────────────────────────────────────────────────

router.post(
  '/enroll',
  uploadFace.single('face'),      // accepts image OR JSON descriptor
  handleUploadError,
  registerFace
);

router.post(
  '/verify',
  uploadFace.single('selfie'),    // accepts image OR JSON descriptor + userId
  handleUploadError,
  verifyFace
);

router.post(
  '/detect',
  uploadFace.single('image'),     // requires image
  handleUploadError,
  detectFace
);

router.get('/status', getFaceStatus);

router.delete('/enrollment', deleteFaceDescriptor);

router.get('/history', paginationValidators, getFaceVerificationHistory);

router.get('/stats', getFaceStats);

module.exports = router;