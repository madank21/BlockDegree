const { asyncHandler } = require('../middleware/errorMiddleware');
const { sendSuccess, sendError } = require('../src/utils/response');
const faceVerificationService = require('../services/faceVerificationService');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { cleanupFile } = require('../middleware/uploadMiddleware');
const { supabaseAdmin } = require('../database/supabase');
const path = require('path');
const fs = require('fs');
const { logger } = require('../src/utils/logger');

// ─── Enroll Face ───────────────────────────────────────────────────────────────
const enrollFace = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, 'No image uploaded.', 400);
  }

  const imagePath = req.file.path;

  try {
    const result = await faceVerificationService.enrollFace(imagePath, req.user.id);

    await AuditLog.log('face_verification', {
      userId: req.user.id,
      resourceType: 'user',
      resourceId: req.user.id,
      newData: { action: 'face_enrolled' },
      ipAddress: req.ip,
    });

    return sendSuccess(res, result, 'Face enrolled successfully');
  } catch (error) {
    cleanupFile(imagePath);
    throw error;
  }
});

// ─── Verify Face ───────────────────────────────────────────────────────────────
const verifyFace = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, 'No image uploaded.', 400);
  }

  const selfieImagePath = req.file.path;
  const { user_id, verification_id } = req.body;

  try {
    // Get target user
    const targetUserId = user_id || req.user.id;
    const targetUser = await User.findById(targetUserId, true);

    if (!targetUser) {
      cleanupFile(selfieImagePath);
      return sendError(res, 'User not found.', 404);
    }

    // Check if user has enrolled face
    if (!targetUser.face_encoding) {
      cleanupFile(selfieImagePath);
      return sendError(res, 'User has not enrolled a face image yet.', 400);
    }

    // Find stored face image
    const faceDir = path.join(__dirname, '../uploads/faces');
    const storedFaceFiles = fs.readdirSync(faceDir).filter(f => f.includes(targetUserId));

    if (storedFaceFiles.length === 0) {
      cleanupFile(selfieImagePath);
      return sendError(res, 'No stored face image found for this user.', 404);
    }

    const storedImagePath = path.join(faceDir, storedFaceFiles[0]);

    // Perform face verification
    const verificationResult = await faceVerificationService.verifyIdentity(
      selfieImagePath,
      storedImagePath,
      targetUserId
    );

    // Save verification result
    await supabaseAdmin.from('face_verifications').insert([{
      user_id: targetUserId,
      verification_id: verification_id || null,
      confidence_score: verificationResult.confidence,
      is_match: verificationResult.isMatch,
      liveness_score: verificationResult.livenessScore,
      liveness_passed: verificationResult.livenessDetected,
      image_url: selfieImagePath,
      api_response: verificationResult,
    }]);

    // Update verification record if provided
    if (verification_id && verificationResult.isMatch) {
      const { supabaseAdmin: db } = require('../database/supabase');
      await db
        .from('verifications')
        .update({ face_verified: true })
        .eq('id', verification_id);
    }

    await AuditLog.log('face_verification', {
      userId: req.user.id,
      resourceType: 'user',
      resourceId: targetUserId,
      newData: {
        isMatch: verificationResult.isMatch,
        confidence: verificationResult.confidence,
      },
      success: verificationResult.isMatch,
      ipAddress: req.ip,
    });

    // Cleanup selfie
    cleanupFile(selfieImagePath);

    return sendSuccess(res, verificationResult, 
      verificationResult.isMatch ? 'Face verification successful' : 'Face verification failed'
    );
  } catch (error) {
    cleanupFile(selfieImagePath);
    throw error;
  }
});

// ─── Detect Face ───────────────────────────────────────────────────────────────
const detectFace = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, 'No image uploaded.', 400);
  }

  const imagePath = req.file.path;

  try {
    const result = await faceVerificationService.detectFace(imagePath);
    cleanupFile(imagePath);
    return sendSuccess(res, result, 'Face detection complete');
  } catch (error) {
    cleanupFile(imagePath);
    throw error;
  }
});

// ─── Get Face Verification History ────────────────────────────────────────────
const getFaceVerificationHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const userId = req.user.role === 'admin' && req.query.user_id
    ? req.query.user_id
    : req.user.id;

  const from = (parseInt(page) - 1) * parseInt(limit);
  const to = from + parseInt(limit) - 1;

  const { data, error, count } = await supabaseAdmin
    .from('face_verifications')
    .select(`
      *,
      user:user_id(id, email, first_name, last_name)
    `, { count: 'exact' })
    .eq('user_id', userId)
    .range(from, to)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return res.status(200).json({
    success: true,
    message: 'Face verification history retrieved',
    data,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit)),
    },
  });
});

// ─── Remove Face Enrollment ────────────────────────────────────────────────────
const removeFaceEnrollment = asyncHandler(async (req, res) => {
  await User.update(req.user.id, { face_encoding: null });

  // Remove stored face images
  const faceDir = path.join(__dirname, '../uploads/faces');
  if (fs.existsSync(faceDir)) {
    const files = fs.readdirSync(faceDir).filter(f => f.includes(req.user.id));
    files.forEach(file => cleanupFile(path.join(faceDir, file)));
  }

  return sendSuccess(res, null, 'Face enrollment removed successfully');
});

module.exports = {
  enrollFace,
  verifyFace,
  detectFace,
  getFaceVerificationHistory,
  removeFaceEnrollment,
};