// services/degree.service.js
const supabase = require("../database/supabase");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode"); // npm install qrcode

/**
 * Generate a dummy blockchain transaction hash (replace with actual blockchain call)
 */
const generateBlockchainHash = async (degreeData) => {
  // In real scenario, you'd call your smart contract to mint NFT/record.
  // For now, return a mock hash.
  return `0x${Math.random().toString(16).substring(2, 10)}${Date.now().toString(16)}`;
};

/**
 * Generate QR code (as data URL) for the degree
 */
const generateQRCode = async (degreeId, studentId) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${degreeId}`;
  try {
    return await QRCode.toDataURL(verificationUrl);
  } catch (err) {
    console.error("QR generation error:", err);
    return null;
  }
};

/**
 * Create a new degree record.
 * @param {Object} degreeData - { student_id, degree_title, field_of_study, graduation_date, gpa, honors, issued_by, issued_at }
 */
async function createDegree(degreeData) {
  try {
    // 1. Insert into degrees table
    const degreeId = uuidv4();
    const newDegree = {
      id: degreeId,
      student_id: degreeData.student_id,
      degree_title: degreeData.degree_title,
      field_of_study: degreeData.field_of_study,
      graduation_date: degreeData.graduation_date,
      gpa: degreeData.gpa,
      honors: degreeData.honors || false,
      issued_by: degreeData.issued_by,
      issued_at: degreeData.issued_at || new Date(),
      blockchain_hash: null, // to be updated after minting
      qr_code: null,        // to be updated after generation
    };

    // 2. Generate blockchain hash (minting) – you can do this async or later
    const blockchainHash = await generateBlockchainHash(newDegree);
    newDegree.blockchain_hash = blockchainHash;

    // 3. Generate QR code
    const qrDataUrl = await generateQRCode(degreeId, degreeData.student_id);
    newDegree.qr_code = qrDataUrl;

    // 4. Insert into Supabase
    const { data, error } = await supabase
      .from("degrees")
      .insert([newDegree])
      .select("*");

    if (error) throw new Error(error.message);

    return { success: true, degree: data[0] };
  } catch (error) {
    console.error("Degree creation error:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Get a degree by ID (with student info)
 */
async function getDegreeById(degreeId) {
  const { data, error } = await supabase
    .from("degrees")
    .select("*, student:users(id, email, full_name)")
    .eq("id", degreeId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * List degrees with optional filters (for admin/university)
 */
async function listDegrees({ studentId, page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  let query = supabase
    .from("degrees")
    .select("*, student:users(id, email, full_name)", { count: "exact" });

  if (studentId) {
    query = query.eq("student_id", studentId);
  }

  query = query.range(offset, offset + limit - 1).order("issued_at", { ascending: false });

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { data, pagination: { page, limit, total: count } };
}

module.exports = {
  createDegree,
  getDegreeById,
  listDegrees,
  generateBlockchainHash,
  generateQRCode,
};