const path = require("path");
const fs = require("fs");
const { asyncHandler } = require("../middleware/errorMiddleware");
const { sendSuccess, sendError, sendCreated, sendPaginated } = require("../src/utils/response");
const Document = require("../models/Document");
const Degree = require("../models/Degree");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User"); // <-- Added for user lookup
const ocrService = require("../services/ocrService");
const fraudDetectionService = require("../services/fraudDetectionService");
const { cleanupFile } = require("../middleware/uploadMiddleware");
const { logger } = require("../src/utils/logger");

// ─── Upload Document ───────────────────────────────────────────────────────────
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, "No file uploaded.", 400);
  }

  const { document_type, degree_id } = req.body;
  const filePath = req.file.path;

  if (!fs.existsSync(filePath)) {
    logger.error(`[uploadDocument] File was NOT saved to ${filePath} immediately after upload!`);
  } else {
    logger.debug(`[uploadDocument] File saved at ${filePath}`);
  }

  try {
    const fileHash = Document.generateFileHash(filePath);
    const duplicate = await Document.findByHash(fileHash);
    if (duplicate && duplicate.user_id === req.user.id) {
      cleanupFile(filePath);
      return sendError(res, "You have already uploaded this exact file.", 409);
    }

    const fileUrl = `/uploads/documents/${req.file.filename}`;
    const documentData = {
      user_id: req.user.id,
      degree_id: degree_id || null,
      document_type: document_type || "degree",
      file_name: req.file.filename,
      original_name: req.file.originalname,
      file_path: filePath,
      file_url: fileUrl,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      file_hash: fileHash,
    };

    const document = await Document.create(documentData);

    setImmediate(async () => {
      try {
        if (!fs.existsSync(filePath)) {
          logger.error(`File not found at ${filePath} for document ${document.id}`);
          await Document.update(document.id, {
            ocr_status: 'failed',
            verification_notes: 'File missing on server after upload',
          });
          return;
        }

        let ocrData = {};
        if (req.file.mimetype.startsWith("image/")) {
          const ocrResult = await ocrService.extractText(filePath);
          ocrData = {
            rawText: ocrResult.rawText,
            confidence: ocrResult.confidence,
            extractedData: ocrResult.extractedData,
          };
          await Document.update(document.id, {
            ocr_data: ocrData,
            ocr_confidence: ocrResult.confidence,
            extracted_data: ocrResult.extractedData || {},
            ocr_text: ocrResult.rawText || null,
          });
        }

        const fraudResult = await fraudDetectionService.analyzeDocument(
          { fileHash, userId: req.user.id },
          { ...ocrData.extractedData, confidence: ocrData.confidence }
        );

        await Document.update(document.id, {
          fraud_score: fraudResult.fraudScore,
          is_verified: !fraudResult.isFraudulent,
          verification_notes: fraudResult.isFraudulent
            ? `Fraud flags: ${fraudResult.flags.join(", ")}`
            : "Document passed automated verification",
        });

        if (fraudResult.isFraudulent) {
          logger.warn(`⚠️ Fraudulent document detected: ${document.id} (Score: ${fraudResult.fraudScore})`);
        }
      } catch (error) {
        logger.error(`Document processing failed for ${document.id}:`, error.message);
      }
    });

    await AuditLog.log("document_uploaded", {
      userId: req.user.id,
      resourceType: "document",
      resourceId: document.id,
      newData: { document_type, file_name: req.file.originalname, file_size: req.file.size },
      ipAddress: req.ip,
    });

    logger.info(`Document uploaded: ${document.id} by user ${req.user.id}`);
    return sendCreated(res, document, "Document uploaded successfully. Processing in background.");
  } catch (error) {
    cleanupFile(filePath);
    logger.error("[uploadDocument] error:", error.message);
    throw error;
  }
});

// ─── Get My Documents ──────────────────────────────────────────────────────────
const getMyDocuments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, document_type } = req.query;

  const result = await Document.findByUser(req.user.id, {
    page: parseInt(page),
    limit: parseInt(limit),
    documentType: document_type,
  });

  return sendPaginated(res, result.data, result, "Documents retrieved successfully");
});

// ─── Get Document By ID ────────────────────────────────────────────────────────
const getDocumentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const document = await Document.findById(id);
  if (!document) return sendError(res, "Document not found.", 404);
  if (req.user.role !== "admin" && document.user_id !== req.user.id) {
    return sendError(res, "Access denied.", 403);
  }
  return sendSuccess(res, document, "Document retrieved successfully");
});

// ─── Get Documents by Degree ───────────────────────────────────────────────────
const getDocumentsByDegree = asyncHandler(async (req, res) => {
  const { degreeId } = req.params;
  const degree = await Degree.findById(degreeId);
  if (!degree) return sendError(res, "Degree not found.", 404);

  const isAdmin = req.user.role === "admin";
  const isOwner = degree.graduateId === req.user.id
    || degree.studentId === req.user.student_id
    || degree.institutionId === (req.user.institution_id || req.user.id);

  if (!isAdmin && !isOwner) {
    return sendError(res, "Access denied.", 403);
  }

  const documents = await Document.findByDegree(degreeId);
  return sendSuccess(res, documents, "Documents retrieved successfully");
});

// ─── Delete Document ───────────────────────────────────────────────────────────
const deleteDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const document = await Document.findById(id);
  if (!document) return sendError(res, "Document not found.", 404);
  if (req.user.role !== "admin" && document.user_id !== req.user.id) {
    return sendError(res, "Access denied.", 403);
  }
  cleanupFile(document.file_path);
  await Document.delete(id);
  await AuditLog.log("document_deleted", {
    userId: req.user.id,
    resourceType: "document",
    resourceId: id,
    oldData: { file_name: document.original_name },
    ipAddress: req.ip,
  });
  return sendSuccess(res, null, "Document deleted successfully");
});

// ─── Get All Documents (Admin) ─────────────────────────────────────────────────
const getAllDocuments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, verified, fraud_score_min } = req.query;
  const result = await Document.findAll({
    page: parseInt(page),
    limit: parseInt(limit),
    isVerified: verified !== undefined ? verified === "true" : undefined,
    fraudScoreMin: fraud_score_min ? parseFloat(fraud_score_min) : undefined,
  });
  return sendPaginated(res, result.data, result, "Documents retrieved successfully");
});

// ─── Re-analyze Document ───────────────────────────────────────────────────────
const reanalyzeDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const document = await Document.findById(id);
  if (!document) return sendError(res, "Document not found.", 404);
  if (!fs.existsSync(document.file_path)) {
    return sendError(res, "Document file not found on server.", 404);
  }
  let ocrData = {};
  if (document.mime_type.startsWith("image/")) {
    const ocrResult = await ocrService.extractText(document.file_path);
    ocrData = {
      rawText: ocrResult.rawText,
      confidence: ocrResult.confidence,
      extractedData: ocrResult.extractedData,
    };
  }
  const fraudResult = await fraudDetectionService.analyzeDocument(
    { fileHash: document.file_hash, userId: document.user_id },
    { ...ocrData.extractedData, confidence: ocrData.confidence }
  );
  const updated = await Document.update(id, {
    ocr_data: ocrData,
    ocr_confidence: ocrData.confidence,
    fraud_score: fraudResult.fraudScore,
    is_verified: !fraudResult.isFraudulent,
    verification_notes: fraudResult.isFraudulent
      ? `Fraud flags: ${fraudResult.flags.join(", ")}`
      : "Document passed automated verification",
  });
  return sendSuccess(res, {
    document: updated,
    ocrData,
    fraudAnalysis: fraudResult,
  }, "Document re-analyzed successfully");
});

// ─── Update Document (for frontend statuses) ──────────────────────────────────
const updateDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const document = await Document.findById(id);
  if (!document) return sendError(res, "Document not found.", 404);
  if (req.user.role !== "admin" && document.user_id !== req.user.id) {
    return sendError(res, "Access denied.", 403);
  }
  const adminFields = [
    "ocr_status", "yolo_status", "validation_status",
    "ocr_confidence", "yolo_valid", "yolo_confidence", "is_verified",
  ];
  const ownerFields = ["ocr_text", "extracted_data", "yolo_detections", "validation_errors"];
  const allowedFields = req.user.role === "admin"
    ? [...adminFields, ...ownerFields]
    : ownerFields;
  const filteredUpdates = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }
  const updated = await Document.update(id, filteredUpdates);
  return sendSuccess(res, updated, "Document updated successfully");
});

// ─── NEW: Verify Document Identity ─────────────────────────────────────────────
const verifyDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Fetch the document
  const document = await Document.findById(id);
  if (!document) {
    return sendError(res, "Document not found.", 404);
  }

  // 2. Authorization: only the owner or admin can verify
  if (req.user.role !== "admin" && document.user_id !== req.user.id) {
    return sendError(res, "Access denied.", 403);
  }

  // 3. Fetch the user to get the official name
  const user = await User.findById(document.user_id);
  if (!user) {
    return sendError(res, "User not found.", 404);
  }

  // 4. Get the extracted name from the document (case‑insensitive compare)
  const extractedName = (
    document.extracted_data?.studentName
    || document.extracted_data?.Name
    || document.ocr_data?.extractedData?.studentName
    || ""
  ).trim();
  const officialName = (user.name || user.full_name || "").trim();

  let status = "valid";
  let errors = [];

  if (!extractedName) {
    status = "mismatch";
    errors.push("No name extracted from document.");
  } else if (!officialName) {
    status = "mismatch";
    errors.push("User profile name is missing.");
  } else if (extractedName.toLowerCase() !== officialName.toLowerCase()) {
    status = "mismatch";
    errors.push(`Extracted name "${extractedName}" does not match profile name "${officialName}".`);
  }

  // 5. Update the document
  const updated = await Document.update(id, {
    validation_status: status,
    validation_errors: errors,
  });

  // 6. Audit log
  await AuditLog.log("document_verified", {
    userId: req.user.id,
    resourceType: "document",
    resourceId: id,
    newData: { status, errors },
    ipAddress: req.ip,
  });

  return sendSuccess(res, updated, "Document verified successfully.");
});

// ─── Export ─────────────────────────────────────────────────────────────────────
module.exports = {
  uploadDocument,
  getMyDocuments,
  getDocumentById,
  getDocumentsByDegree,
  deleteDocument,
  getAllDocuments,
  reanalyzeDocument,
  updateDocument,
  verifyDocument,   // <-- new export
};