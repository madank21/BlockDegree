const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess, sendError, sendCreated, sendPaginated } = require('../src/utils/response');
const Degree = require('../models/Degree');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const blockchainService = require('../services/blockchainService');
const qrService = require('../services/qrService');
const notificationService = require('../services/notificationService');
const { logger } = require('../src/utils/logger');

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

  // Verify graduate exists
  const graduate = await User.findById(graduate_id);
  if (!graduate) {
    return sendError(res, 'Graduate not found.', 404);
  }

  if (graduate.role !== 'graduate') {
    return sendError(res, 'Specified user is not a graduate.', 400);
  }

  // Create degree record
  const degreeData = {
    graduate_id,
    issuing_institution_id: req.user.id,
    student_name,
    student_id,
    degree_title,
    field_of_study,
    graduation_date,
    issue_date: new Date().toISOString().split('T')[0],
    gpa: gpa || null,
    honors: honors || null,
    status: 'pending',
    metadata: metadata || {},
  };

  const degree = await Degree.create(degreeData);

  // Register on blockchain (async)
  setImmediate(async () => {
    try {
      const blockchainResult = await blockchainService.issueDegree({
        degreeHash: degree.degree_hash,
        graduateAddress: null,
        studentName: student_name,
        degreeTitle: degree_title,
        institutionName: req.user.institution_name,
        graduationDate: graduation_date,
        certificateNumber: degree.certificate_number,
        degreeId: degree.id,
      });

      await Degree.update(degree.id, {
        blockchain_tx_hash: blockchainResult.txHash,
        blockchain_block_number: blockchainResult.blockNumber,
        blockchain_timestamp: blockchainResult.timestamp,
        token_id: blockchainResult.tokenId,
        status: 'verified',
      });

      // Generate QR Code
      const qrResult = await qrService.generateQRCode(degree.id, degree.certificate_number);
      await Degree.update(degree.id, { qr_code_url: qrResult.fileUrl });

      // Send notification to graduate
      notificationService.sendDegreeIssuedEmail(graduate, {
        ...degree,
        blockchain_tx_hash: blockchainResult.txHash,
      }).catch(err => logger.error('Degree issued email failed:', err));

      logger.info(`Degree ${degree.id} successfully registered on blockchain: ${blockchainResult.txHash}`);
    } catch (error) {
      logger.error(`Blockchain registration failed for degree ${degree.id}:`, error.message);
      await Degree.update(degree.id, {
        status: 'pending',
        metadata: { ...degree.metadata, blockchainError: error.message },
      });
    }
  });

  await AuditLog.log('degree_issued', {
    userId: req.user.id,
    resourceType: 'degree',
    resourceId: degree.id,
    newData: { degree_title, student_name, certificate_number: degree.certificate_number },
    ipAddress: req.ip,
  });

  logger.info(`Degree issued: ${degree.certificate_number} for ${student_name}`);

  return sendCreated(res, degree, 'Degree issued successfully. Blockchain registration in progress.');
});

// ─── Get All Degrees ───────────────────────────────────────────────────────────
const getAllDegrees = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const { role, id: userId } = req.user;

  let result;

  if (role === 'admin') {
    result = await Degree.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      search,
    });
  } else if (role === 'university') {
    result = await Degree.findByInstitution(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      search,
    });
  } else if (role === 'graduate') {
    result = await Degree.findByGraduate(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } else {
    return sendError(res, 'Access denied.', 403);
  }

  return sendPaginated(res, result.data, result, 'Degrees retrieved successfully');
});

// ─── Get Degree By ID ──────────────────────────────────────────────────────────
const getDegreeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const degree = await Degree.findById(id);

  if (!degree) {
    return sendError(res, 'Degree not found.', 404);
  }

  // Access control
  const { role, id: userId } = req.user;
  if (role === 'graduate' && degree.graduate_id !== userId) {
    return sendError(res, 'Access denied.', 403);
  }
  if (role === 'university' && degree.issuing_institution_id !== userId) {
    return sendError(res, 'Access denied.', 403);
  }

  return sendSuccess(res, degree, 'Degree retrieved successfully');
});

// ─── Get Degree QR Code ────────────────────────────────────────────────────────
const getDegreeQRCode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const degree = await Degree.findById(id);

  if (!degree) {
    return sendError(res, 'Degree not found.', 404);
  }

  // Generate fresh QR if not exists
  const qrResult = await qrService.generateQRCodeDataURL(id, degree.certificate_number);

  return sendSuccess(res, {
    qrCode: qrResult.dataUrl,
    verificationUrl: qrResult.verificationUrl,
    certificateNumber: degree.certificate_number,
  }, 'QR code generated');
});

// ─── Update Degree ─────────────────────────────────────────────────────────────
const updateDegree = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const degree = await Degree.findById(id);

  if (!degree) {
    return sendError(res, 'Degree not found.', 404);
  }

  // Only issuing institution or admin can update
  if (req.user.role !== 'admin' && degree.issuing_institution_id !== req.user.id) {
    return sendError(res, 'Access denied.', 403);
  }

  if (degree.is_revoked) {
    return sendError(res, 'Cannot update a revoked degree.', 400);
  }

  const allowedFields = ['gpa', 'honors', 'metadata'];
  const updateData = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) updateData[field] = req.body[field];
  });

  const updated = await Degree.update(id, updateData);

  await AuditLog.log('degree_issued', {
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
  if (!degree) {
    return sendError(res, 'Degree not found.', 404);
  }

  if (degree.is_revoked) {
    return sendError(res, 'Degree is already revoked.', 400);
  }

  // Access control
  if (req.user.role !== 'admin' && degree.issuing_institution_id !== req.user.id) {
    return sendError(res, 'Access denied.', 403);
  }

  // Revoke on blockchain
  let blockchainResult = null;
  if (degree.degree_hash) {
    try {
      blockchainResult = await blockchainService.revokeDegree(degree.degree_hash, reason);
    } catch (error) {
      logger.error('Blockchain revocation failed:', error.message);
    }
  }

  // Revoke in DB
  const revokedDegree = await Degree.revoke(id, req.user.id, reason);

  // Notify graduate
  const graduate = await User.findById(degree.graduate_id);
  if (graduate) {
    notificationService.sendDegreeRevokedEmail(graduate, degree, reason)
      .catch(err => logger.error('Revocation email failed:', err));
  }

  await AuditLog.log('degree_revoked', {
    userId: req.user.id,
    resourceType: 'degree',
    resourceId: id,
    newData: { reason, blockchainTx: blockchainResult?.txHash },
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

  if (!degree) {
    return sendError(res, 'Degree not found.', 404);
  }

  // Return public-safe fields only
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