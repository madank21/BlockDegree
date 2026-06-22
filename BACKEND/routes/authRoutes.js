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
const User = require('../models/User'); // import for debug route

// ─── Middleware: Ensure user is active ──────────────────────────────────────
const checkActive = async (req, res, next) => {
  try {
    // req.user is set by authenticate middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    // Re-fetch user to get fresh is_active value
    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) {
      return res.status(403).json({ message: 'Account deactivated' });
    }
    next();
  } catch (error) {
    console.error('checkActive error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

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

// ─── Protected Routes (require authentication + active account) ──────────────
router.use(authenticate);
router.use(checkActive); // <-- all routes below require active account

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

// ─── Debug route (optional) ──────────────────────────────────────────────────
router.get('/me/status', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;