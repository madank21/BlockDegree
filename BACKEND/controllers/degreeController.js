// /controllers/degreeController.js — Supabase only
const asyncHandler = require("express-async-handler");
const Degree              = require("../models/Degree");
const AuditLog            = require("../models/AuditLog");
const { generateDegreeHash }  = require("../src/utils/hash");
const { mintingQueue }        = require("../queues/mintingQueue");
const blockchainService       = require("../services/blockchainService");
const QRService               = require("../services/qrService");
const notificationService     = require("../services/notificationService");
const {
  sendCreated, sendSuccess, sendPaginated,
  sendError,   sendNotFound, sendForbidden,
} = require("../src/utils/response");
const { logger } = require("../src/utils/logger");

// POST /api/v1/degrees/issue
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
    status: "pending",
    blockchain_sync_status: "queued",
  });

  try {
    await mintingQueue.add("mint-degree", { degreeId: degree.id }, { jobId: `mint-${degree.id}`, priority: 1 });
    logger.info(`[Degree] Job enqueued: ${degree.id}`);
  } catch (qErr) {
    logger.error(`[Degree] Queue error: ${qErr.message}`);
    await Degree.update(degree.id, { blockchainSyncStatus: "queue_error" });
  }

  await AuditLog.create({
    action: "DEGREE_ISSUED", actorId: req.user.id, actorRole: req.user.role,
    targetId: degree.id, targetType: "degree",
    details: { studentName: student_name, studentId: student_id, degreeHash: degreeHash.substring(0, 16) + "..." },
    ipAddress: req.ip,
  });

  const verificationUrl   = `${process.env.FRONTEND_URL}/verify/${degree.id}/${degreeHash}`;
  const certificateNumber = degree.certificate_number || "PENDING_BATCH";

  return sendCreated(res, {
    degree: {
      id: degree.id, studentName: degree.student_name, studentId: degree.student_id,
      degreeTitle: degree.degree_title, fieldOfStudy: degree.field_of_study,
      graduationDate: degree.graduation_date, degreeHash: degree.degree_hash,
      certificateNumber, status: degree.status,
      blockchainStatus: "processing", verificationUrl, issuedAt: degree.created_at,
    },
  }, "Degree issuance initiated — blockchain minting in progress");
});

// GET /api/v1/degrees
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

// GET /api/v1/degrees/:id
const getDegreeById = asyncHandler(async (req, res) => {
  const degree = await Degree.findById(req.params.id);
  if (!degree) return sendNotFound(res, "Degree");

  if (req.user.role === "student" && degree.student_id !== req.user.student_id)
    return sendForbidden(res, "Access denied");
  if (req.user.role === "university" && degree.institution_id !== (req.user.institution_id || req.user.id))
    return sendForbidden(res, "Access denied");

  return sendSuccess(res, { degree });
});

// GET /api/v1/degrees/:id/qr
const getDegreeQR = asyncHandler(async (req, res) => {
  const degree = await Degree.findById(req.params.id);
  if (!degree) return sendNotFound(res, "Degree");

  if (degree.qr_code_url) {
    return sendSuccess(res, {
      qrCode: degree.qr_code_url,
      verificationUrl: `${process.env.FRONTEND_URL}/verify/${degree.id}/${degree.degree_hash}`,
      certificateNumber: degree.certificate_number || "PENDING_BATCH",
    });
  }

  if (!degree.blockchain_tx_hash) {
    return sendError(res, "QR not yet available — minting in progress", 202);
  }

  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${degree.id}/${degree.degree_hash}`;
  const qrDataUrl = await QRService.generateDegreeQR(
    String(degree.id), degree.degree_hash, degree.blockchain_tx_hash, verificationUrl
  );
  await Degree.update(degree.id, { qrCodeUrl: qrDataUrl });

  return sendSuccess(res, { qrCode: qrDataUrl, verificationUrl, certificateNumber: degree.certificate_number || "PENDING_BATCH" });
});

// POST /api/v1/degrees/:id/revoke
const revokeDegree = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const degree = await Degree.findById(req.params.id);
  if (!degree) return sendNotFound(res, "Degree");
  if (degree.status === "revoked") return sendError(res, "Already revoked", 400);

  let blockchainRevocation = null;
  if (degree.blockchain_sync_status === "success") {
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

  if (degree.graduate_email) {
    notificationService.sendDegreeRevokedEmail(degree.graduate_email, {
      studentName: degree.student_name, degreeTitle: degree.degree_title, reason,
    }).catch(() => {});
  }

  return sendSuccess(res, { degree: revoked }, "Degree revoked successfully");
});

// GET /api/v1/degrees/stats
const getDegreeStats = asyncHandler(async (req, res) => {
  const institutionId = req.user.role === "university" ? (req.user.institution_id || req.user.id) : null;
  const stats = await Degree.getStats(institutionId);
  return sendSuccess(res, stats, "Statistics retrieved");
});

// GET /api/v1/degrees/public/cert/:certNumber
const getPublicCertificate = asyncHandler(async (req, res) => {
  const degree = await Degree.findByCertNumber(req.params.certNumber);
  if (!degree) return sendNotFound(res, "Certificate");

  return sendSuccess(res, {
    degreeTitle: degree.degree_title, studentName: degree.student_name,
    graduationDate: degree.graduation_date, certificateNumber: degree.certificate_number,
    degreeHash: degree.degree_hash, status: degree.status,
    transactionHash: degree.blockchain_tx_hash,
    ipfsCID: degree.ipfs_cid,
    ipfsUrl: degree.ipfs_cid ? `https://ipfs.io/ipfs/${degree.ipfs_cid}` : null,
  });
});

module.exports = { issueDegree, getDegrees, getDegreeById, getDegreeQR, revokeDegree, getDegreeStats, getPublicCertificate };