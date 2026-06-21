const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess, sendError, sendCreated, sendPaginated } = require('../src/utils/response');
const Verification = require('../models/Verification');
const Degree = require('../models/Degree');
const AuditLog = require('../models/AuditLog');
const blockchainService = require('../services/blockchainService');
const notificationService = require('../services/notificationService');
const { logger } = require('../src/utils/logger');

// ─── Request Verification ──────────────────────────────────────────────────────
const requestVerification = asyncHandler(async (req, res) => {
  const {
    degree_id,
    requester_email,
    requester_organization,
    purpose,
  } = req.body;

  // Get degree
  const degree = await Degree.findById(degree_id);
  if (!degree) {
    return sendError(res, 'Degree not found.', 404);
  }

  // Use status field
  if (degree.status === 'revoked') {
    return sendError(res, 'This degree has been revoked and cannot be verified.', 400);
  }

  // Create verification request
  const verification = await Verification.create({
    degree_id,
    requested_by: req.user?.id || null,
    requester_email: requester_email || req.user?.email || null,
    requester_organization: requester_organization || req.user?.institution_name || null,
    purpose: purpose || null,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  });

  // Run blockchain verification asynchronously
  setImmediate(async () => {
    try {
      const blockchainResult = await blockchainService.verifyDegree(degree.degreeHash);

      const verificationResult = {
        blockchain: blockchainResult,
        degree: {
          title: degree.degreeTitle,
          studentName: degree.studentName,
          certificateNumber: degree.certificateNumber,
          graduationDate: degree.graduationDate,
          institution: degree.institutionName,
        },
        fraudCheck: {
          passed: true,
          score: 0,
        },
      };

      const finalStatus = blockchainResult.isValid && !blockchainResult.isRevoked
        ? 'verified'
        : 'rejected';

      await Verification.update(verification.id, {
        status: finalStatus,
        blockchain_verified: blockchainResult.isValid,
        document_verified: true,
        fraud_check_passed: true,
        fraud_score: 0,
        verification_result: verificationResult,
        verified_at: new Date().toISOString(),
      });

      // Notify requester
      if (verification.requester_email) {
        notificationService.sendVerificationCompleteEmail(
          verification.requester_email,
          { ...verification, status: finalStatus, blockchain_verified: blockchainResult.isValid },
          degree
        ).catch(err => logger.error('Verification email failed:', err));
      }

      logger.info(`Verification ${verification.id} completed: ${finalStatus}`);
    } catch (error) {
      logger.error(`Verification ${verification.id} failed:`, error.message);
      await Verification.update(verification.id, {
        status: 'flagged',
        notes: `Verification error: ${error.message}`,
      });
    }
  });

  await AuditLog.log('verification_requested', {
    userId: req.user?.id,
    resourceType: 'verification',
    resourceId: verification.id,
    newData: { degree_id, requester_email },
    ipAddress: req.ip,
  });

  return sendCreated(res, {
    verification_code: verification.verification_code,
    verification_id: verification.id,
    status: verification.status,
    message: 'Verification initiated. Results will be available shortly.',
  }, 'Verification requested successfully');
});

// ─── Get Verification by Code ──────────────────────────────────────────────────
const getVerificationByCode = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const verification = await Verification.findByCode(code);

  if (!verification) {
    return sendError(res, 'Verification not found.', 404);
  }

  // Check expiry
  if (verification.expires_at && new Date(verification.expires_at) < new Date()) {
    return sendError(res, 'Verification link has expired.', 410);
  }

  return sendSuccess(res, verification, 'Verification retrieved successfully');
});

// ─── Get Verification by ID ────────────────────────────────────────────────────
const getVerificationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const verification = await Verification.findById(id);

  if (!verification) {
    return sendError(res, 'Verification not found.', 404);
  }

  // Access control
  const { role, id: userId } = req.user;
  if (role === 'employer' && verification.requested_by !== userId) {
    return sendError(res, 'Access denied.', 403);
  }

  return sendSuccess(res, verification, 'Verification retrieved successfully');
});

// ─── Get All Verifications ─────────────────────────────────────────────────────
const getAllVerifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const { role, id: userId } = req.user;

  const requestedBy = ['employer', 'graduate'].includes(role) ? userId : null;

  const result = await Verification.findAll({
    page: parseInt(page),
    limit: parseInt(limit),
    status,
    requestedBy,
  });

  return sendPaginated(res, result.data, result, 'Verifications retrieved successfully');
});

// ─── Verify Degree by Hash (Public) ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// FIX: Return exactly the frontend‑expected shape:
//   { valid: true, degreeDetails: {...}, blockchain: {...} }
// ═══════════════════════════════════════════════════════════════════════════════
const verifyDegreePublic = asyncHandler(async (req, res) => {
  const { hash } = req.params;

  // Find degree by hash (now returns full camelCase data)
  const degree = await Degree.findByHash(hash);
  if (!degree) {
    return sendError(res, 'Degree not found on blockchain registry.', 404);
  }

  // Check blockchain
  let blockchainData = null;
  try {
    blockchainData = await blockchainService.verifyDegree(hash);
  } catch (error) {
    logger.warn('Blockchain verification error:', error.message);
  }

  // Determine validity
  const isRevoked = degree.status === 'revoked' || blockchainData?.isRevoked || false;
  const isValid = blockchainData?.isValid && !isRevoked;

  // Build frontend‑compatible response
  const responseData = {
    valid: isValid,
    degreeDetails: {
      degreeId: degree.id,
      studentName: degree.studentName,
      registrationNumber: degree.studentId,
      degreeTitle: degree.degreeTitle,
      department: degree.fieldOfStudy,
      cgpa: degree.gpa,
      graduationYear: degree.graduationDate,
      // Additional useful fields (optional)
      certificateNumber: degree.certificateNumber,
      institution: degree.institutionName,
      issuedBy: degree.issuedBy,
    },
    blockchain: {
      txHash: degree.blockchainTxHash,
      syncStatus: degree.blockchainSyncStatus,
      ...(blockchainData && {
        verified: blockchainData.isValid,
        blockNumber: blockchainData.blockNumber,
        timestamp: blockchainData.timestamp,
      }),
    },
  };

  const statusMessage = isValid
    ? 'Degree is VALID and verified on blockchain'
    : 'Degree could NOT be verified';

  return sendSuccess(res, responseData, statusMessage);
});

// ─── Get Verification Stats ────────────────────────────────────────────────────
const getVerificationStats = asyncHandler(async (req, res) => {
  const userId = req.user.role === 'admin' ? null : req.user.id;
  const stats = await Verification.getStats(userId);
  return sendSuccess(res, stats, 'Verification statistics retrieved');
});

// ─── Re-verify (Manual Trigger) ───────────────────────────────────────────────
const retriggerVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const verification = await Verification.findById(id);

  if (!verification) {
    return sendError(res, 'Verification not found.', 404);
  }

  if (!['admin', 'university'].includes(req.user.role)) {
    return sendError(res, 'Access denied.', 403);
  }

  const degree = await Degree.findById(verification.degree_id);
  if (!degree) {
    return sendError(res, 'Associated degree not found.', 404);
  }

  try {
    const blockchainResult = await blockchainService.verifyDegree(degree.degreeHash);

    const status = blockchainResult.isValid && !blockchainResult.isRevoked
      ? 'verified'
      : 'rejected';

    const updated = await Verification.update(id, {
      status,
      blockchain_verified: blockchainResult.isValid,
      verification_result: { blockchain: blockchainResult },
      verified_at: new Date().toISOString(),
    });

    return sendSuccess(res, updated, 'Verification re-triggered successfully');
  } catch (error) {
    return sendError(res, `Re-verification failed: ${error.message}`, 500);
  }
});

module.exports = {
  requestVerification,
  getVerificationByCode,
  getVerificationById,
  getAllVerifications,
  verifyDegreePublic,
  getVerificationStats,
  retriggerVerification,
};