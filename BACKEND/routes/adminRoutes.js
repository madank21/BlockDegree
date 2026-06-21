// BACKEND/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeAdmin } = require('../middleware/roleMiddleware');  // ✅ correct
const { uploadImport } = require('../middleware/uploadMiddleware');   // ✅ correct

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorizeAdmin);   // ✅ middleware (no parentheses)

// Stats & Integrity
router.get('/stats', adminController.getStats);
router.get('/integrity', adminController.checkIntegrity);

// Backup & Restore
router.post('/backup', adminController.createBackup);
router.get('/backup/last', adminController.getLastBackupInfo);
router.post('/restore', adminController.restoreBackup);

// Export & Import
router.get('/export', adminController.exportData);
router.post('/import', uploadImport.single('data'), adminController.importData);

// Cleanup & Reset
router.delete('/cleanup', adminController.cleanupOldDocuments);
router.delete('/reset', adminController.resetData);

module.exports = router;