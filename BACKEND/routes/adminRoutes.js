// BACKEND/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware'); // if you have a multer setup

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Stats & Integrity
router.get('/stats', adminController.getStats);
router.get('/integrity', adminController.checkIntegrity);

// Backup & Restore
router.post('/backup', adminController.createBackup);
router.get('/backup/last', adminController.getLastBackupInfo);
router.post('/restore', adminController.restoreBackup);

// Export & Import
router.get('/export', adminController.exportData);
router.post('/import', upload.single('data'), adminController.importData); // 'data' matches frontend field name

// Cleanup & Reset (use with extreme caution)
router.delete('/cleanup', adminController.cleanupOldDocuments);
router.delete('/reset', adminController.resetData);

module.exports = router;