// /controllers/faceController.js — Supabase + file support
const asyncHandler = require("express-async-handler");
const fs = require("fs");
const FaceVerificationService = require("../services/faceVerificationService");
const AuditLog = require("../models/AuditLog");
const { sendSuccess, sendError, sendCreated } = require("../src/utils/response");

// Helper: extract descriptor from uploaded file or body
const getDescriptorFromRequest = async (req) => {
  if (req.file) {
    // If an image file was uploaded, extract the descriptor
    const descriptor = await FaceVerificationService.extractDescriptorFromImage(req.file.path);
    // Clean up the uploaded file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return descriptor;
  }
  // Otherwise, read from JSON body
  const { descriptor } = req.body;
  if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
    throw new Error("Descriptor must be a 128‑dimension array");
  }
  return descriptor;
};

// POST /api/v1/face/enroll (was /register)
const registerFace = asyncHandler(async (req, res) => {
  try {
    const descriptor = await getDescriptorFromRequest(req);
    const result = await FaceVerificationService.registerDescriptor(req.user.id, descriptor);
    await AuditLog.create({
      action: "FACE_REGISTERED",
      actorId: req.user.id,
      actorRole: req.user.role,
      targetId: req.user.id,
    });
    return sendCreated(res, result, "Face descriptor registered");
  } catch (error) {
    // Clean up file if still present
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return sendError(res, error.message, 400);
  }
});

// POST /api/v1/face/verify
const verifyFace = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) throw new Error("userId is required");
    const descriptor = await getDescriptorFromRequest(req);
    const result = await FaceVerificationService.verifyDescriptor(userId, descriptor);
    // Log verification attempt
    await AuditLog.create({
      action: "FACE_VERIFIED",
      actorId: req.user.id,
      actorRole: req.user.role,
      targetId: userId,
      metadata: { verified: result.verified, confidence: result.confidence },
    });
    return sendSuccess(res, result, result.verified ? "Face verified" : "Face verification failed");
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return sendError(res, error.message, 400);
  }
});

// POST /api/v1/face/detect – NEW
const detectFace = asyncHandler(async (req, res) => {
  if (!req.file) return sendError(res, "Image file is required", 400);
  try {
    const detectionResult = await FaceVerificationService.detectFaces(req.file.path);
    // Clean up
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return sendSuccess(res, detectionResult, "Face detection completed");
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return sendError(res, error.message, 400);
  }
});

// GET /api/v1/face/status
const getFaceStatus = asyncHandler(async (req, res) => {
  const status = await FaceVerificationService.hasDescriptor(req.user.id);
  return sendSuccess(res, { userId: req.user.id, ...status });
});

// DELETE /api/v1/face/enrollment (was /descriptor)
const deleteFaceDescriptor = asyncHandler(async (req, res) => {
  const result = await FaceVerificationService.deleteDescriptor(req.user.id);
  await AuditLog.create({
    action: "FACE_DELETED",
    actorId: req.user.id,
    actorRole: req.user.role,
    targetId: req.user.id,
  });
  return sendSuccess(res, result, "Face descriptor deleted");
});

// GET /api/v1/face/history – NEW
const getFaceVerificationHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  // Assuming AuditLog has a method to fetch by action(s)
  const { rows, count } = await AuditLog.findAndCountAll({
    where: { action: ["FACE_VERIFIED", "FACE_REGISTERED", "FACE_DELETED"] },
    order: [["createdAt", "DESC"]],
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
  return sendSuccess(res, {
    history: rows,
    pagination: { page: parseInt(page), limit: parseInt(limit), total: count },
  });
});

// GET /api/v1/face/stats
const getFaceStats = asyncHandler(async (req, res) => {
  const stats = await FaceVerificationService.getVerificationStats();
  return sendSuccess(res, stats, "Face stats retrieved");
});

module.exports = {
  registerFace,
  verifyFace,
  detectFace,
  getFaceStatus,
  deleteFaceDescriptor,
  getFaceVerificationHistory,
  getFaceStats,
};