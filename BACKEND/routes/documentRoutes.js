const express = require('express');
const router = express.Router();

const {
  uploadDocument,
  getMyDocuments,
  getDocumentById,
  getDocumentsByDegree,
  deleteDocument,
  getAllDocuments,
  reanalyzeDocument,
} = require('../controllers/documentController');

const { authenticate } = require('../middleware/authMiddleware');
const { authorize, authorizeAdmin } = require('../middleware/roleMiddleware');
const { uploadDocument: uploadMiddleware, handleUploadError } = require('../middleware/uploadMiddleware');
const { uuidParamValidator, paginationValidators } = require('../src/utils/validators');

router.use(authenticate);

router.get('/me', paginationValidators, getMyDocuments);
router.get('/all', authorizeAdmin, paginationValidators, getAllDocuments);
router.get('/degree/:degreeId', ...uuidParamValidator('degreeId'), getDocumentsByDegree);
router.get('/:id', ...uuidParamValidator(), getDocumentById);

router.post(
  '/upload',
  uploadMiddleware.single('document'),
  handleUploadError,
  uploadDocument
);

router.post('/:id/reanalyze', 
  authorizeAdmin,
  ...uuidParamValidator(),
  reanalyzeDocument
);

router.delete('/:id', ...uuidParamValidator(), deleteDocument);

module.exports = router;