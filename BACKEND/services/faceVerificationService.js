// /services/faceVerificationService.js — Supabase only
const crypto = require("crypto");
const User   = require("../models/User");
const { getSupabaseAdmin } = require("../database/supabase");
const { logger } = require("../src/utils/logger");

const MATCH_THRESHOLD = parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.6;
const HIGH_CONF       = 0.4;
const DIMENSIONS      = 128;

const euclidean = (d1, d2) =>
  Math.sqrt(d1.reduce((s, v, i) => s + Math.pow(v - d2[i], 2), 0));

const cosine = (d1, d2) => {
  const dot  = d1.reduce((s, v, i) => s + v * d2[i], 0);
  const mag1 = Math.sqrt(d1.reduce((s, v) => s + v * v, 0));
  const mag2 = Math.sqrt(d2.reduce((s, v) => s + v * v, 0));
  return dot / (mag1 * mag2);
};

class FaceVerificationService {

  static async registerDescriptor(userId, descriptor) {
    if (!Array.isArray(descriptor) || descriptor.length !== DIMENSIONS)
      throw new Error(`Expected ${DIMENSIONS}-dim descriptor, got ${descriptor?.length}`);

    const isValid = descriptor.every((v) => typeof v === "number" && isFinite(v) && Math.abs(v) <= 5);
    if (!isValid) throw new Error("Descriptor contains invalid values");

    await User.update(userId, { faceDescriptor: descriptor });
    logger.info(`[Face] Descriptor registered: ${userId}`);

    return {
      success: true, userId, dimensions: DIMENSIONS,
      registeredAt: new Date().toISOString(),
    };
  }

  static async verifyDescriptor(userId, liveDescriptor) {
    if (!Array.isArray(liveDescriptor) || liveDescriptor.length !== DIMENSIONS)
      throw new Error(`Invalid live descriptor dimensions: ${liveDescriptor?.length}`);

    const stored = await User.getFaceDescriptor(userId);
    if (!stored?.descriptor || stored.descriptor.length !== DIMENSIONS) {
      return { verified: false, confidence: 0, hasDescriptor: false, message: "No face registered" };
    }

    const distance   = euclidean(stored.descriptor, liveDescriptor);
    const similarity = cosine(stored.descriptor, liveDescriptor);
    const confidence = Math.max(0, Math.round((1 - distance / MATCH_THRESHOLD) * 100));
    const isMatch    = distance < MATCH_THRESHOLD;

    logger.info(`[Face] distance=${distance.toFixed(4)}, confidence=${confidence}%, match=${isMatch}`);

    const supabase = getSupabaseAdmin();
    await supabase.from("face_verification_logs").insert({
      user_id: userId, distance: parseFloat(distance.toFixed(4)),
      confidence, is_match: isMatch, threshold: MATCH_THRESHOLD,
      verified_at: new Date().toISOString(),
    }).catch((e) => logger.warn(`[Face] Log failed: ${e.message}`));

    return {
      verified: isMatch, confidence,
      distance: parseFloat(distance.toFixed(4)),
      similarity: parseFloat(similarity.toFixed(4)),
      threshold: MATCH_THRESHOLD,
      isHighConfidence: distance < HIGH_CONF,
      hasDescriptor: true,
      descriptorRegisteredAt: stored.registeredAt,
      message: isMatch
        ? `Identity verified — ${confidence}% confidence`
        : `Mismatch — ${confidence}% confidence`,
      metadata: { algorithm: "Euclidean Distance — face-api.js 128-dim", dimensions: DIMENSIONS },
    };
  }

  static async hasDescriptor(userId) {
    const stored = await User.getFaceDescriptor(userId);
    return {
      hasDescriptor: !!(stored?.descriptor?.length === DIMENSIONS),
      registeredAt:  stored?.registeredAt || null,
    };
  }

  static async deleteDescriptor(userId) {
    await User.update(userId, { deleteFace: true });
    logger.info(`[Face] Descriptor deleted: ${userId}`);
    return { success: true, message: "Face descriptor permanently deleted" };
  }

  static async getVerificationStats() {
    const [total, withFace] = await Promise.all([
      User.countTotal(),
      User.countWithFace(),
    ]);

    const supabase = getSupabaseAdmin();
    const { data: logs } = await supabase
      .from("face_verification_logs")
      .select("is_match");

    const logRows = logs || [];
    const matched = logRows.filter((l) => l.is_match).length;

    return {
      totalUsers:              total,
      usersWithFaceRegistered: withFace,
      coveragePercent: total > 0 ? ((withFace / total) * 100).toFixed(1) : "0.0",
      totalVerifications: logRows.length,
      successfulMatches:  matched,
      matchRate: logRows.length > 0 ? ((matched / logRows.length) * 100).toFixed(1) : "0.0",
      threshold:  MATCH_THRESHOLD,
      algorithm:  "Euclidean Distance — face-api.js 128-dim descriptors",
    };
  }
}

module.exports = FaceVerificationService;