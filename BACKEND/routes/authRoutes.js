const express = require('express');
const router = express.Router();

const {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
} = require('../controllers/authController');

const { authenticate } = require('../middleware/authMiddleware');
const { uploadAvatar, handleUploadError } = require('../middleware/uploadMiddleware');
const {
  registerValidators,
  loginValidators,
  handleValidationErrors,
} = require('../src/utils/validators');
const { body } = require('express-validator');

// ─── Public Routes ─────────────────────────────────────────────────────────────
router.post('/register', registerValidators, register);
router.post('/login', loginValidators, login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', 
  body('email').isEmail().withMessage('Valid email required'),
  handleValidationErrors,
  forgotPassword
);
router.post('/reset-password',
  body('token').notEmpty().withMessage('Token required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must meet complexity requirements'),
  handleValidationErrors,
  resetPassword
);
router.get('/verify-email/:token', verifyEmail);

// ─── Protected Routes ──────────────────────────────────────────────────────────
router.use(authenticate);

router.get('/me', getMe);
router.patch(
  '/me',
  uploadAvatar.single('avatar'),
  handleUploadError,
  updateProfile
);
router.post('/logout', logout);
router.patch('/change-password',
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('New password must meet complexity requirements'),
  handleValidationErrors,
  changePassword
);

module.exports = router;