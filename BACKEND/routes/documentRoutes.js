// BACKEND/routes/documentRoutes.js
const express = require("express");
const router = express.Router();

const {
  uploadDocument,
  getMyDocuments,
  getDocumentById,
  getDocumentsByDegree,
  deleteDocument,
  getAllDocuments,
  reanalyzeDocument,
  updateDocument,      // new
} = require("../controllers/documentController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/roleMiddleware");
const { uploadDocument: uploadMiddleware, handleUploadError } = require("../middleware/uploadMiddleware");
const { uuidParamValidator, paginationValidators } = require("../src/utils/validators");

router.use(authenticate);

router.get("/me", paginationValidators, getMyDocuments);
router.get("/all", authorizeAdmin, paginationValidators, getAllDocuments);
router.get("/degree/:degreeId", ...uuidParamValidator("degreeId"), getDocumentsByDegree);
router.get("/:id", ...uuidParamValidator(), getDocumentById);

router.post(
  "/upload",
  uploadMiddleware.single("document"),
  handleUploadError,
  uploadDocument
);

// NEW: Update document (for OCR/YOLO/validation statuses)
router.put("/:id", ...uuidParamValidator(), updateDocument);

router.post("/:id/reanalyze", 
  authorizeAdmin,
  ...uuidParamValidator(),
  reanalyzeDocument
);

router.delete("/:id", ...uuidParamValidator(), deleteDocument);

module.exports = router;