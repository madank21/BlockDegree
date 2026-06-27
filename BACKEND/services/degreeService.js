const supabase = require("../database/supabase");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");
const crypto = require("crypto");
const blockchainService = require("./blockchainService"); // ← real blockchain

/**
 * Generate a SHA‑256 hash of the degree content (degree_hash)
 */
const generateDegreeHash = (degreeData) => {
  const { student_id, degree_title, field_of_study, graduation_date, gpa, honors, issued_by } = degreeData;
  const raw = `${student_id}|${degree_title}|${field_of_study}|${graduation_date}|${gpa}|${honors}|${issued_by}|${new Date().toISOString()}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
};

/**
 * DEPRECATED: dummy hash – kept for backward compatibility, not used.
 * Real blockchain calls are made via blockchainService.issueDegree()
 */
const generateBlockchainHash = async (degreeData) => {
  // In production, call your smart contract here.
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
 * Generate a certificate number (e.g., BD-2026-100001)
 */
const generateCertificateNumber = async () => {
  const year = new Date().getFullYear();
  const { count, error } = await supabase
    .from('degrees')
    .select('*', { count: 'exact', head: true });
  if (error) throw new Error(`Failed to count degrees: ${error.message}`);
  const seq = String((count || 0) + 1).padStart(5, '0');
  return `BD-${year}-${seq}`;
};

/**
 * Fetch student's name from users table
 */
const getStudentName = async (studentId) => {
  const { data, error } = await supabase
    .from('users')
    .select('name')          // or 'full_name' depending on your schema
    .eq('id', studentId)
    .single();

  if (error || !data) {
    throw new Error(`Student with id ${studentId} not found`);
  }
  return data.name;
};

/**
 * Create a new degree record – now issues the degree on the blockchain for real.
 * @param {Object} degreeData - { student_id, degree_title, field_of_study, graduation_date, gpa, honors, issued_by }
 */
async function createDegree(degreeData) {
  try {
    const degreeId = uuidv4();

    const studentName = await getStudentName(degreeData.student_id);
    const degreeHash = generateDegreeHash(degreeData);
    const qrCodeUrl = await generateQRCode(degreeId, degreeData.student_id);
    const certificateNumber = await generateCertificateNumber();

    // ── Call the real blockchain ────────────────────────────────────────────
    const blockchainResult = await blockchainService.issueDegree({
      degreeId:           degreeId,
      degreeHash:         degreeHash,
      studentName:        studentName,
      registrationNumber: degreeData.student_id,
      department:         degreeData.field_of_study,
      program:            degreeData.degree_title,
      cgpa:               String(degreeData.gpa || '0'),
      graduationYear:     String(new Date(degreeData.graduation_date).getFullYear()),
    });

    // ── Build degree object with on‑chain data ─────────────────────────────
    const newDegree = {
      id: degreeId,
      student_id: degreeData.student_id,
      student_name: studentName,
      graduate_id: null,
      graduate_email: null,
      degree_title: degreeData.degree_title,
      field_of_study: degreeData.field_of_study,
      graduation_date: degreeData.graduation_date,
      gpa: degreeData.gpa,
      honors: degreeData.honors || false,
      metadata: {},
      institution_id: degreeData.institution_id || null,
      institution_name: degreeData.institution_name || null,
      issued_by: degreeData.issued_by,
      degree_hash: degreeHash,
      certificate_number: certificateNumber,
      status: 'issued',
      blockchain_sync_status: 'success',           // real success
      blockchain_tx_hash: blockchainResult.txHash,
      blockchain_block_number: blockchainResult.blockNumber,
      blockchain_timestamp: blockchainResult.timestamp
        ? Math.floor(new Date(blockchainResult.timestamp).getTime() / 1000)
        : null,
      revocation_reason: null,
      revoked_at: null,
      revocation_tx_hash: null,
      qr_code_url: qrCodeUrl,
      ipfs_cid: null,
      ipfs_gateway_url: null,
      document_hash: null,
      document_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

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
    .select("*, student:users(id, email, name)")
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
    .select("*, student:users(id, email, name)", { count: "exact" });

  if (studentId) {
    query = query.eq("student_id", studentId);
  }

  query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false });

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { data, pagination: { page, limit, total: count } };
}

module.exports = {
  createDegree,
  getDegreeById,
  listDegrees,
  generateBlockchainHash,   // kept for backward compatibility
  generateQRCode,
};