// BACKEND/controllers/documentController.js
const path = require("path");
const fs = require("fs");
const { asyncHandler } = require("../middleware/errorMiddleware");
const { sendSuccess, sendError, sendCreated, sendPaginated } = require("../src/utils/response");
const Document = require("../models/Document");
const AuditLog = require("../models/AuditLog");
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

  try {
    // Generate file hash
    const fileHash = Document.generateFileHash(filePath);

    // Check for duplicate (based on hash and user)
    const duplicate = await Document.findByHash(fileHash);
    if (duplicate && duplicate.user_id === req.user.id) {
      cleanupFile(filePath);
      return sendError(res, "You have already uploaded this exact file.", 409);
    }

    // Build file URL
    const fileUrl = `/uploads/documents/${req.file.filename}`;

    // Create document record
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

    // Process document asynchronously (OCR + Fraud Detection)
    setImmediate(async () => {
      try {
        // ─── Safety: ensure file still exists ──────────────────────────────────
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
          });
        }

        // Run fraud detection
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

  if (!document) {
    return sendError(res, "Document not found.", 404);
  }

  // Access control
  if (req.user.role !== "admin" && document.user_id !== req.user.id) {
    return sendError(res, "Access denied.", 403);
  }

  return sendSuccess(res, document, "Document retrieved successfully");
});

// ─── Get Documents by Degree ───────────────────────────────────────────────────
const getDocumentsByDegree = asyncHandler(async (req, res) => {
  const { degreeId } = req.params;
  const documents = await Document.findByDegree(degreeId);
  return sendSuccess(res, documents, "Documents retrieved successfully");
});

// ─── Delete Document ───────────────────────────────────────────────────────────
const deleteDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const document = await Document.findById(id);

  if (!document) {
    return sendError(res, "Document not found.", 404);
  }

  if (req.user.role !== "admin" && document.user_id !== req.user.id) {
    return sendError(res, "Access denied.", 403);
  }

  // Delete physical file
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

  if (!document) {
    return sendError(res, "Document not found.", 404);
  }

  // ─── Safety: check file exists ──────────────────────────────────────────────
  if (!fs.existsSync(document.file_path)) {
    return sendError(res, "Document file not found on server.", 404);
  }

  // Re-run OCR
  let ocrData = {};
  if (document.mime_type.startsWith("image/")) {
    const ocrResult = await ocrService.extractText(document.file_path);
    ocrData = {
      rawText: ocrResult.rawText,
      confidence: ocrResult.confidence,
      extractedData: ocrResult.extractedData,
    };
  }

  // Re-run fraud detection
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

  // Ensure the document exists and user has access
  const document = await Document.findById(id);
  if (!document) {
    return sendError(res, "Document not found.", 404);
  }
  if (req.user.role !== "admin" && document.user_id !== req.user.id) {
    return sendError(res, "Access denied.", 403);
  }

  // Allowed fields to update (prevent overwriting sensitive data)
  const allowedFields = [
    "ocr_status", "yolo_status", "validation_status",
    "ocr_text", "ocr_confidence", "extracted_data",
    "yolo_detections", "validation_errors",
    "yolo_valid", "yolo_confidence"
  ];
  const filteredUpdates = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  const updated = await Document.update(id, filteredUpdates);
  return sendSuccess(res, updated, "Document updated successfully");
});

module.exports = {
  uploadDocument,
  getMyDocuments,
  getDocumentById,
  getDocumentsByDegree,
  deleteDocument,
  getAllDocuments,
  reanalyzeDocument,
  updateDocument,
};