// /services/faceVerificationService.js — Supabase + face-api.js (with Node canvas)
const crypto = require("crypto");
const User   = require("../models/User");
const { getSupabaseAdmin } = require("../database/supabase");
const { logger } = require("../src/utils/logger");

// -------------------- Configuration --------------------
const MATCH_THRESHOLD = parseFloat(process.env.FACE_MATCH_THRESHOLD) || 0.6;
const HIGH_CONF       = 0.4;
const DIMENSIONS      = 128;

// -------------------- Distance functions --------------------
const euclidean = (d1, d2) =>
  Math.sqrt(d1.reduce((s, v, i) => s + Math.pow(v - d2[i], 2), 0));

const cosine = (d1, d2) => {
  const dot  = d1.reduce((s, v, i) => s + v * d2[i], 0);
  const mag1 = Math.sqrt(d1.reduce((s, v) => s + v * v, 0));
  const mag2 = Math.sqrt(d2.reduce((s, v) => s + v * v, 0));
  return dot / (mag1 * mag2);
};

// -------------------- Face Recognition Library Setup --------------------
// We use @vladmandic/face-api (fork of face-api.js that works with Node)
// Install: npm install @vladmandic/face-api canvas
const faceapi = require("@vladmandic/face-api");
const canvas = require("canvas");
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Path to models (download from https://github.com/justadudewhohacks/face-api.js/tree/master/weights)
const MODEL_PATH = process.env.FACE_MODEL_PATH || "./models";

let modelsLoaded = false;

/**
 * Load face detection and recognition models once.
 * Call this at app startup, or let the first request trigger it.
 */
const loadModels = async () => {
  if (modelsLoaded) return;
  try {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
    modelsLoaded = true;
    logger.info("[Face] Models loaded successfully");
  } catch (err) {
    logger.error(`[Face] Failed to load models: ${err.message}`);
    throw new Error("Face recognition models unavailable");
  }
};

// -------------------- Service Class --------------------
class FaceVerificationService {

  // ── Existing methods (unchanged) ────────────────────────────────

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

  // ── NEW: Extract 128‑dim descriptor from an image file ──────────

  /**
   * Reads an image from disk, detects the largest face,
   * computes its descriptor, and returns it as a Float32Array/array.
   * @param {string} filePath - Path to the uploaded image file.
   * @returns {Promise<number[]>} 128‑dim descriptor.
   */
  static async extractDescriptorFromImage(filePath) {
    await loadModels(); // ensure models are loaded

    // Load image using canvas
    const img = await canvas.loadImage(filePath);

    // Detect single face (largest)
    const detections = await faceapi.detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detections) {
      throw new Error("No face detected in the image");
    }

    // descriptor is a Float32Array – convert to plain array
    const descriptor = Array.from(detections.descriptor);
    if (descriptor.length !== DIMENSIONS) {
      throw new Error(`Expected ${DIMENSIONS}-dim descriptor, got ${descriptor.length}`);
    }

    logger.info(`[Face] Descriptor extracted from image (${filePath})`);
    return descriptor;
  }

  // ── NEW: Detect faces in an image ──────────────────────────────

  /**
   * Detects all faces in an image and returns bounding boxes,
   * landmarks, and (optionally) descriptors.
   * @param {string} filePath - Path to the image.
   * @returns {Promise<Object>} { faces: [ { box, landmarks, descriptor? } ] }
   */
  static async detectFaces(filePath) {
    await loadModels();

    const img = await canvas.loadImage(filePath);

    // Detect all faces (with landmarks and descriptors)
    const detections = await faceapi.detectAllFaces(img)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!detections || detections.length === 0) {
      return { faces: [], count: 0 };
    }

    const faces = detections.map((det) => ({
      box: {
        x: det.detection.box.x,
        y: det.detection.box.y,
        width: det.detection.box.width,
        height: det.detection.box.height,
      },
      landmarks: det.landmarks.positions.map((p) => ({ x: p.x, y: p.y })),
      descriptor: Array.from(det.descriptor), // include if needed
    }));

    logger.info(`[Face] Detected ${faces.length} face(s) in ${filePath}`);
    return { faces, count: faces.length };
  }
}

module.exports = FaceVerificationService;