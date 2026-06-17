// controllers/degreeController.js
const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess, sendError, sendCreated, sendPaginated } = require('../src/utils/response');
const Degree = require('../models/Degree');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const blockchainService = require('../services/blockchainService');
const QRService = require('../services/qrService');
const notificationService = require('../services/notificationService');
const { logger } = require('../src/utils/logger');
const { generateDegreeHash } = require('../src/utils/hash');

// ─── Issue Degree ──────────────────────────────────────────────────────────────
const issueDegree = asyncHandler(async (req, res) => {
  const {
    graduate_id,
    student_name,
    student_id,
    degree_title,
    field_of_study,
    graduation_date,
    gpa,
    honors,
    metadata,
  } = req.body;

  // Validate graduate existence and role authority
  const graduate = await User.findById(graduate_id);
  if (!graduate) return sendError(res, 'Graduate not found.', 404);
  if (graduate.role !== 'graduate') return sendError(res, 'Specified user is not a graduate.', 400);

  // ─── 1. Core Deterministic Hashing (Shared Pipeline Utility) ──────────────
  const degreeHash = generateDegreeHash(req.body);

  // ─── 2. Create local database record with strict state tracking ─────────
  const degreeData = {
    graduate_id,
    issuing_institution_id: req.user.id,
    student_name,
    student_id,
    degree_title,
    field_of_study,
    graduation_date,
    issue_date: new Date().toISOString().split('T')[0],
    gpa: gpa ? String(gpa) : null,
    honors: honors || null,
    degree_hash: degreeHash,
    status: 'pending',                 // Base document status
    blockchain_sync_status: 'queued',  // Set to 'queued' first to ensure clear tracking
    metadata: metadata || {},
  };

  const degree = await Degree.create(degreeData);
  const blockchainDegreeId = String(degree.id); 

  // ─── 3. Trigger resilient background blockchain registration ──────────────
  // Dispatched asynchronously. In high throughput networks, pass `degree.id` straight to a BullMQ worker pool.
  setImmediate(async () => {
    try {
      const blockchainResult = await blockchainService.issueDegree({
        degreeId: blockchainDegreeId,
        studentName: student_name,
        registrationNumber: student_id,
        department: field_of_study,
        program: degree_title,
        cgpa: String(gpa || 0),
        graduationYear: new Date(graduation_date).getFullYear().toString(),
        degreeHash,
      });

      // Format timestamp with numeric sanity checks
      const formattedTimestamp = blockchainResult.timestamp || new Date().toISOString();

      // Update local database with explicit transaction confirmations and transition to 'issued'
      await Degree.update(degree.id, {
        blockchain_tx_hash: blockchainResult.txHash,
        blockchain_block_number: blockchainResult.blockNumber,
        blockchain_timestamp: formattedTimestamp,
        status: 'issued', 
        blockchain_sync_status: 'success',
      });

      // Fixed QR Generator Parameter Signature Alignment (Expects 4 positional inputs)
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${degree.id}/${degreeHash}`;
      const qrCodeDataUrl = await QRService.generateDegreeQR(
        blockchainDegreeId,
        degreeHash,
        blockchainResult.txHash,
        verificationUrl
      );
      await Degree.update(degree.id, { qr_code_url: qrCodeDataUrl });

      // Dispatch non-blocking communication alerts out to the verified graduate
      notificationService.sendDegreeIssuedEmail(graduate, {
        ...degree,
        blockchain_tx_hash: blockchainResult.txHash,
        verification_url: verificationUrl,
      }).catch(err => logger.error('Degree issued email dispatch failure:', err));

      logger.info(`Degree ${degree.id} successfully minted on-chain. Hash: ${blockchainResult.txHash}`);
    } catch (error) {
      logger.error(`Blockchain registration failure sequence on degree asset ${degree.id}:`, error.message);
      await Degree.update(degree.id, {
        status: 'pending',
        blockchain_sync_status: 'failed',
        metadata: { 
          ...(degree.metadata || {}), 
          blockchainError: error.message,
          failedAt: new Date().toISOString()
        },
      });
    }
  });

  // ─── 4. Local audit trail logging (Safeguarded against un-generated sequence values) ───
  const activeCertificateNumber = degree.certificate_number || 'PENDING_BATCH';

  await AuditLog.log('degree_issued', {
    userId: req.user.id,
    resourceType: 'degree',
    resourceId: degree.id,
    newData: { degree_title, student_name, certificate_number: activeCertificateNumber },
    ipAddress: req.ip,
  });

  logger.info(`Degree transaction initialized: ${activeCertificateNumber} issued for student ${student_name}`);

  return sendCreated(res, {
    ...(degree.toJSON ? degree.toJSON() : degree),
    blockchainStatus: 'processing',
    verificationUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${degree.id}/${degreeHash}`,
  }, 'Degree processing completed locally. Network broadcast synchronization initiated.');
});

// ─── Get All Degrees ───────────────────────────────────────────────────────────
const getAllDegrees = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const { role, id: userId } = req.user;

  let result;
  if (role === 'admin') {
    result = await Degree.findAll({ page: +page, limit: +limit, status, search });
  } else if (role === 'university') {
    result = await Degree.findByInstitution(userId, { page: +page, limit: +limit, status, search });
  } else if (role === 'graduate') {
    result = await Degree.findByGraduate(userId, { page: +page, limit: +limit });
  } else {
    return sendError(res, 'Access denied.', 403);
  }

  return sendPaginated(res, result.data, result, 'Degrees retrieved successfully');
});

// ─── Get Degree By ID ──────────────────────────────────────────────────────────
const getDegreeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const degree = await Degree.findById(id);
  if (!degree) return sendError(res, 'Degree not found.', 404);

  const { role, id: userId } = req.user;
  if (role === 'graduate' && degree.graduate_id !== userId) return sendError(res, 'Access denied.', 403);
  if (role === 'university' && degree.issuing_institution_id !== userId) return sendError(res, 'Access denied.', 403);

  return sendSuccess(res, degree, 'Degree retrieved successfully');
});

// ─── Get Degree QR Code ────────────────────────────────────────────────────────
const getDegreeQRCode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const degree = await Degree.findById(id);
  if (!degree) return sendError(res, 'Degree not found.', 404);

  // Fallback checks preventing parameter omission crash states if requested instantly after generation
  const activeHash = degree.degree_hash || '';
  const txHash = degree.blockchain_tx_hash || 'pending';
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${degree.id}/${activeHash}`;
  
  const qrCodeDataUrl = await QRService.generateDegreeQR(
    String(degree.id),
    activeHash,
    txHash,
    verificationUrl
  );

  return sendSuccess(res, {
    qrCode: qrCodeDataUrl,
    verificationUrl,
    certificateNumber: degree.certificate_number || 'PENDING_SYNC',
  }, 'QR code generated successfully.');
});

// ─── Update Degree ─────────────────────────────────────────────────────────────
const updateDegree = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const degree = await Degree.findById(id);
  if (!degree) return sendError(res, 'Degree not found.', 404);

  if (req.user.role !== 'admin' && degree.issuing_institution_id !== req.user.id) {
    return sendError(res, 'Access denied.', 403);
  }
  if (degree.is_revoked) return sendError(res, 'Cannot update a revoked degree.', 400);

  const allowedFields = ['gpa', 'honors', 'metadata'];
  const updateData = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) updateData[field] = req.body[field];
  });

  const updated = await Degree.update(id, updateData);

  await AuditLog.log('degree_updated', {
    userId: req.user.id,
    resourceType: 'degree',
    resourceId: id,
    oldData: degree,
    newData: updateData,
    ipAddress: req.ip,
  });

  return sendSuccess(res, updated, 'Degree updated successfully');
});

// ─── Revoke Degree ─────────────────────────────────────────────────────────────
const revokeDegree = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || reason.trim().length < 10) {
    return sendError(res, 'Revocation reason must be at least 10 characters.', 400);
  }

  const degree = await Degree.findById(id);
  if (!degree) return sendError(res, 'Degree not found.', 404);
  if (degree.is_revoked) return sendError(res, 'Degree is already revoked.', 400);

  if (req.user.role !== 'admin' && degree.issuing_institution_id !== req.user.id) {
    return sendError(res, 'Access denied.', 403);
  }

  // ─── Revoke on blockchain only if it was issued on‑chain ────────────────
  let blockchainResult = null;
  if (degree.blockchain_tx_hash) {
    try {
      // Reason parameter channeled down to the contract tracking logic safely
      blockchainResult = await blockchainService.revokeDegree(String(degree.id));
    } catch (error) {
      logger.error('On-chain contract revocation routine aborted:', error.message);
      return sendError(res, `Blockchain revocation execution failure: ${error.message}`, 500);
    }
  }

  // Revoke within local database storage
  const revokedDegree = await Degree.revoke(id, req.user.id, reason);

  // Notify graduate
  const graduate = await User.findById(degree.graduate_id);
  if (graduate) {
    notificationService.sendDegreeRevokedEmail(graduate, degree, reason)
      .catch(err => logger.error('Revocation warning email routing failure:', err));
  }

  await AuditLog.log('degree_revoked', {
    userId: req.user.id,
    resourceType: 'degree',
    resourceId: id,
    newData: { reason, blockchainTx: blockchainResult?.txHash || 'N/A' },
    ipAddress: req.ip,
  });

  return sendSuccess(res, revokedDegree, 'Degree revoked successfully');
});

// ─── Get Degree Stats ──────────────────────────────────────────────────────────
const getDegreeStats = asyncHandler(async (req, res) => {
  const institutionId = req.user.role === 'university' ? req.user.id : null;
  const stats = await Degree.getStats(institutionId);
  return sendSuccess(res, stats, 'Degree statistics retrieved');
});

// ─── Public: Get Degree by Certificate Number ──────────────────────────────────
const getDegreePublic = asyncHandler(async (req, res) => {
  const { certNumber } = req.params;
  const degree = await Degree.findByCertificateNumber(certNumber);
  if (!degree) return sendError(res, 'Degree not found.', 404);

  // Public-safe fields only
  const publicData = {
    id: degree.id,
    degree_title: degree.degree_title,
    field_of_study: degree.field_of_study,
    student_name: degree.student_name,
    graduation_date: degree.graduation_date,
    certificate_number: degree.certificate_number,
    degree_hash: degree.degree_hash,
    status: degree.status,
    is_revoked: degree.is_revoked,
    institution: degree.institution,
    blockchain_tx_hash: degree.blockchain_tx_hash,
    blockchain_sync_status: degree.blockchain_sync_status,
  };

  return sendSuccess(res, publicData, 'Degree information retrieved');
});

module.exports = {
  issueDegree,
  getAllDegrees,
  getDegreeById,
  getDegreeQRCode,
  updateDegree,
  revokeDegree,
  getDegreeStats,
  getDegreePublic,
};