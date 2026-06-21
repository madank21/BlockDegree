// /controllers/degreeController.js — Supabase only
const asyncHandler = require("express-async-handler");
const Degree              = require("../models/Degree");
const AuditLog            = require("../models/AuditLog");
const { generateDegreeHash }  = require("../src/utils/hash");
const blockchainService       = require("../services/blockchainService");
const QRService               = require("../services/qrService");
const notificationService     = require("../services/notificationService");
const {
  sendCreated, sendSuccess, sendPaginated,
  sendError,   sendNotFound, sendForbidden,
} = require("../src/utils/response");
const { logger } = require("../src/utils/logger");

// ─── POST /api/v1/degrees/issue ──────────────────────────────────────────────
const issueDegree = asyncHandler(async (req, res) => {
  const { student_name, student_id, degree_title, field_of_study, graduation_date, gpa, honors, metadata, graduate_id, graduate_email } = req.body;

  const degreeHash = generateDegreeHash({ student_name, student_id, degree_title, field_of_study, graduation_date, gpa });

  const existing = await Degree.findByHash(degreeHash);
  if (existing) {
    return sendError(res, "Degree with identical credentials already exists", 409, { existingDegreeId: existing.id });
  }

  const institutionId   = req.user.institution_id || req.user.id;
  const institutionName = req.user.institution_name || req.user.name || "Unknown Institution";

  const degree = await Degree.create({
    student_name, student_id,
    graduate_id: graduate_id || null,
    graduate_email: graduate_email || null,
    degree_title, field_of_study, graduation_date,
    gpa: gpa || null,
    honors: honors || null,
    metadata: metadata || {},
    institution_id: institutionId,
    institution_name: institutionName,
    issued_by: req.user.id,
    degree_hash: degreeHash,
    status: "issued",
    blockchain_sync_status: "processing"
  });

  try {
    const blockchainResult = await blockchainService.issueDegree({
      degreeId: String(degree.id),
      studentName: degree.studentName,
      registrationNumber: degree.studentId,
      department: degree.fieldOfStudy,
      program: degree.degreeTitle,
      cgpa: String(degree.gpa || "0"),
      graduationYear: String(
        new Date(degree.graduationDate).getFullYear()
      ),
      degreeHash: degree.degreeHash
    });

    const updatedDegree = await Degree.update(degree.id, {
      blockchain_tx_hash: blockchainResult.txHash,
      blockchain_sync_status: "success",
    });
  } catch (err) {
    logger.error(err);

    await Degree.update(degree.id, {
      blockchain_sync_status: "failed"
    });

    return sendError(
      res,
      `Blockchain minting failed: ${err.message}`,
      500
    );
  }

  await AuditLog.create({
    action: "DEGREE_ISSUED", actorId: req.user.id, actorRole: req.user.role,
    targetId: degree.id, targetType: "degree",
    details: { studentName: student_name, studentId: student_id, degreeHash: degreeHash.substring(0, 16) + "..." },
    ipAddress: req.ip,
  });

  const verificationUrl   = `${process.env.FRONTEND_URL}/verify/${degree.id}/${degreeHash}`;
  const certificateNumber = degree.certificateNumber || "PENDING_BATCH";

  return sendCreated(res, {
    degree: {
      id: degree.id,
      studentName: degree.studentName,
      studentId: degree.studentId,
      degreeTitle: degree.degreeTitle,
      fieldOfStudy: degree.fieldOfStudy,
      graduationDate: degree.graduationDate,
      degreeHash: degree.degreeHash,
      certificateNumber,
      status: degree.status,
      blockchainStatus: degree.blockchainSyncStatus,
      verificationUrl,
      issuedAt: degree.createdAt,
    },
  }, "Degree issuance initiated — blockchain minting in progress");
});

// ─── POST /api/v1/degrees/:id/issue (Issue an existing degree) ─────────────
const issueExistingDegree = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Fetch the degree to ensure it exists
  const degree = await Degree.findById(id);
  if (!degree) {
    return sendNotFound(res, "Degree");
  }

  // 2. Prevent re‑issuing if already issued
  if (degree.status === "issued") {
    return sendError(res, "Degree is already issued", 400);
  }

  // 3. Update the status to "issued"
  //    Optionally set blockchainSyncStatus to 'queued' to trigger minting later.
  const updatedDegree = await Degree.update(id, {
    status: "issued",
    // blockchainSyncStatus: "queued",   // uncomment if you have a background worker
  });

  // 4. (Optional) If you need to mint on the blockchain immediately:
  //    await blockchainService.mintDegree(updatedDegree);

  // 5. Audit log
  await AuditLog.create({
    action: "DEGREE_ISSUED",
    actorId: req.user.id,
    actorRole: req.user.role,
    targetId: degree.id,
    targetType: "degree",
    details: { previousStatus: degree.status },
    ipAddress: req.ip,
  });

  return sendSuccess(res, { degree: updatedDegree }, "Degree issued successfully");
});

// ─── GET /api/v1/degrees ──────────────────────────────────────────────────────
const getDegrees = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const filter = {};

  if (req.user.role === "student")    filter.studentId     = req.user.student_id;
  if (req.user.role === "university") filter.institutionId = req.user.institution_id || req.user.id;
  if (status) filter.status = status;
  if (search) filter.search = search;

  const { data, total } = await Degree.findMany({ page, limit, ...filter });
  return sendPaginated(res, data, total, page, limit, "Degrees retrieved");
});

// ─── GET /api/v1/degrees/:id ──────────────────────────────────────────────────
const getDegreeById = asyncHandler(async (req, res) => {
  const degree = await Degree.findById(req.params.id);
  if (!degree) return sendNotFound(res, "Degree");

  if (req.user.role === "student" && degree.studentId !== req.user.student_id)
    return sendForbidden(res, "Access denied");
  if (req.user.role === "university" && degree.institutionId !== (req.user.institution_id || req.user.id))
    return sendForbidden(res, "Access denied");

  return sendSuccess(res, { degree });
});

// ─── GET /api/v1/degrees/:id/qr ──────────────────────────────────────────────
const getDegreeQR = asyncHandler(async (req, res) => {
  const degree = await Degree.findById(req.params.id);
  if (!degree) return sendNotFound(res, "Degree");

  if (degree.qrCodeUrl) {
    return sendSuccess(res, {
      qrCode: degree.qrCodeUrl,
      verificationUrl: `${process.env.FRONTEND_URL}/verify/${degree.id}/${degree.degreeHash}`,
      certificateNumber: degree.certificateNumber || "PENDING_BATCH",
    });
  }

  if (!degree.blockchainTxHash) {
    return sendError(res, "QR not yet available — minting in progress", 202);
  }

  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${degree.id}/${degree.degreeHash}`;
  const qrDataUrl = await QRService.generateDegreeQR(
    String(degree.id), degree.degreeHash, degree.blockchainTxHash, verificationUrl
  );
  await Degree.update(degree.id, { qrCodeUrl: qrDataUrl });

  return sendSuccess(res, { qrCode: qrDataUrl, verificationUrl, certificateNumber: degree.certificateNumber || "PENDING_BATCH" });
});

// ─── POST /api/v1/degrees/:id/revoke ─────────────────────────────────────────
const revokeDegree = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const degree = await Degree.findById(req.params.id);
  if (!degree) return sendNotFound(res, "Degree");
  if (degree.status === "revoked") return sendError(res, "Already revoked", 400);

  let blockchainRevocation = null;
  if (degree.blockchainSyncStatus === "success") {
    try {
      blockchainRevocation = await blockchainService.revokeDegree(String(degree.id));
    } catch (err) {
      return sendError(res, `Blockchain revocation failed: ${err.message}`, 500);
    }
  }

  const revoked = await Degree.update(degree.id, {
    status: "revoked", revocationReason: reason,
    revokedAt: new Date().toISOString(),
    revocationTxHash: blockchainRevocation?.txHash || null,
  });

  await AuditLog.create({
    action: "DEGREE_REVOKED", actorId: req.user.id, actorRole: req.user.role,
    targetId: degree.id, details: { reason, txHash: blockchainRevocation?.txHash },
    ipAddress: req.ip,
  });

  if (degree.graduateEmail) {
    notificationService.sendDegreeRevokedEmail(degree.graduateEmail, {
      studentName: degree.studentName,
      degreeTitle: degree.degreeTitle,
      reason,
    }).catch(() => {});
  }

  return sendSuccess(res, { degree: revoked }, "Degree revoked successfully");
});

// ─── GET /api/v1/degrees/stats ───────────────────────────────────────────────
const getDegreeStats = asyncHandler(async (req, res) => {
  const institutionId = req.user.role === "university" ? (req.user.institution_id || req.user.id) : null;
  const stats = await Degree.getStats(institutionId);
  return sendSuccess(res, stats, "Statistics retrieved");
});

// ─── GET /api/v1/degrees/public/cert/:certNumber ─────────────────────────────
const getPublicCertificate = asyncHandler(async (req, res) => {
  const degree = await Degree.findByCertNumber(req.params.certNumber);
  if (!degree) return sendNotFound(res, "Certificate");

  return sendSuccess(res, {
    degreeTitle: degree.degreeTitle,
    studentName: degree.studentName,
    graduationDate: degree.graduationDate,
    certificateNumber: degree.certificateNumber,
    degreeHash: degree.degreeHash,
    status: degree.status,
    transactionHash: degree.blockchainTxHash,
    ipfsCID: degree.ipfsCid,
    ipfsUrl: degree.ipfsCid ? `https://ipfs.io/ipfs/${degree.ipfsCid}` : null,
  });
});

// ─── PATCH /api/v1/degrees/:id ───────────────────────────────────────────────
const updateDegree = asyncHandler(async (req, res) => {
  const { gpa, honors, metadata } = req.body;
  const degree = await Degree.findById(req.params.id);
  if (!degree) return sendNotFound(res, "Degree");

  // Only certain fields can be updated
  const updates = {};
  if (gpa !== undefined) updates.gpa = gpa;
  if (honors !== undefined) updates.honors = honors;
  if (metadata !== undefined) updates.metadata = metadata;

  if (Object.keys(updates).length === 0) {
    return sendError(res, "No valid fields to update", 400);
  }

  const updatedDegree = await Degree.update(degree.id, updates);

  await AuditLog.create({
    action: "DEGREE_UPDATED",
    actorId: req.user.id,
    actorRole: req.user.role,
    targetId: degree.id,
    details: updates,
    ipAddress: req.ip,
  });

  return sendSuccess(res, { degree: updatedDegree }, "Degree updated");
});

// ─── EXPORTS ──────────────────────────────────────────────────────────────────
module.exports = {
  issueDegree,
  issueExistingDegree,   // <-- new export
  getDegrees,
  getDegreeById,
  getDegreeQR,
  revokeDegree,
  getDegreeStats,
  getPublicCertificate,
  updateDegree,
};