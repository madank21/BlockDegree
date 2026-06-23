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
  updateDocument,
  verifyDocument,         // <-- imported
} = require("../controllers/documentController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/roleMiddleware");
const { uploadDocument: uploadMiddleware, handleUploadError } = require("../middleware/uploadMiddleware");
const { uuidParamValidator, paginationValidators } = require("../src/utils/validators");

// All routes require authentication
router.use(authenticate);

// ─── GET routes ─────────────────────────────────────────────────────────────────
router.get("/me", paginationValidators, getMyDocuments);
router.get("/all", authorizeAdmin, paginationValidators, getAllDocuments);
router.get("/degree/:degreeId", ...uuidParamValidator("degreeId"), getDocumentsByDegree);
router.get("/:id", ...uuidParamValidator(), getDocumentById);

// ─── POST ──────────────────────────────────────────────────────────────────────
router.post(
  "/upload",
  uploadMiddleware.single("document"),
  handleUploadError,
  uploadDocument
);

// ─── NEW: Verify identity ──────────────────────────────────────────────────────
router.post("/:id/verify", ...uuidParamValidator(), verifyDocument);

// ─── PUT ───────────────────────────────────────────────────────────────────────
router.put("/:id", ...uuidParamValidator(), updateDocument);

// ─── POST (re‑analyze) ────────────────────────────────────────────────────────
router.post(
  "/:id/reanalyze",
  authorizeAdmin,
  ...uuidParamValidator(),
  reanalyzeDocument
);

// ─── DELETE ────────────────────────────────────────────────────────────────────
router.delete("/:id", ...uuidParamValidator(), deleteDocument);

module.exports = router;