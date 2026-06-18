// /controllers/faceController.js — Supabase only
const asyncHandler = require("express-async-handler");
const fs = require("fs");
const FaceVerificationService = require("../services/faceVerificationService");
const AuditLog = require("../models/AuditLog");
const { sendSuccess, sendError, sendCreated } = require("../src/utils/response");

// POST /api/v1/face/register
const registerFace = asyncHandler(async (req, res) => {
  const { descriptor } = req.body;
  if (!descriptor || !Array.isArray(descriptor)) return sendError(res, "Face descriptor array required", 400);
  if (descriptor.length !== 128) return sendError(res, `Expected 128-dim, got ${descriptor.length}`, 400);

  const result = await FaceVerificationService.registerDescriptor(req.user.id, descriptor);
  await AuditLog.create({ action: "FACE_REGISTERED", actorId: req.user.id, actorRole: req.user.role, targetId: req.user.id });

  if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  return sendCreated(res, result, "Face descriptor registered");
});

// POST /api/v1/face/verify
const verifyFace = asyncHandler(async (req, res) => {
  const { userId, descriptor } = req.body;
  if (!userId || !descriptor || !Array.isArray(descriptor)) return sendError(res, "userId and descriptor required", 400);

  const result = await FaceVerificationService.verifyDescriptor(userId, descriptor);
  return sendSuccess(res, result, result.verified ? "Face verified" : "Face verification failed");
});

// GET /api/v1/face/status
const getFaceStatus = asyncHandler(async (req, res) => {
  const status = await FaceVerificationService.hasDescriptor(req.user.id);
  return sendSuccess(res, { userId: req.user.id, ...status });
});

// DELETE /api/v1/face/descriptor
const deleteFaceDescriptor = asyncHandler(async (req, res) => {
  const result = await FaceVerificationService.deleteDescriptor(req.user.id);
  await AuditLog.create({ action: "FACE_DELETED", actorId: req.user.id, actorRole: req.user.role, targetId: req.user.id });
  return sendSuccess(res, result, "Face descriptor deleted");
});

// GET /api/v1/face/stats
const getFaceStats = asyncHandler(async (req, res) => {
  const stats = await FaceVerificationService.getVerificationStats();
  return sendSuccess(res, stats, "Face stats retrieved");
});

module.exports = { registerFace, verifyFace, getFaceStatus, deleteFaceDescriptor, getFaceStats };