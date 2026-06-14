const express = require('express');
const router = express.Router();

const {
  enrollFace,
  verifyFace,
  detectFace,
  getFaceVerificationHistory,
  removeFaceEnrollment,
} = require('../controllers/faceController');

const { authenticate } = require('../middleware/authMiddleware');
const { uploadFace, handleUploadError } = require('../middleware/uploadMiddleware');
const { paginationValidators } = require('../src/utils/validators');

router.use(authenticate);

router.post(
  '/enroll',
  uploadFace.single('face'),
  handleUploadError,
  enrollFace
);

router.post(
  '/verify',
  uploadFace.single('selfie'),
  handleUploadError,
  verifyFace
);

router.post(
  '/detect',
  uploadFace.single('image'),
  handleUploadError,
  detectFace
);

router.get('/history', paginationValidators, getFaceVerificationHistory);
router.delete('/enrollment', removeFaceEnrollment);

module.exports = router;