// /models/Degree.js
// ─────────────────────────────────────────────────────────────────────────────
// Degree Model — Supabase Query Wrapper
// No Mongoose. No MongoDB. Pure Supabase PostgreSQL.
// ─────────────────────────────────────────────────────────────────────────────

const { getSupabaseAdmin } = require("../database/supabase");

const TABLE = "degrees";

const DEFAULT_COLUMNS = [
  "id", "student_name", "student_id",
  "graduate_id", "graduate_email",
  "degree_title", "field_of_study", "graduation_date",
  "gpa", "honors", "metadata",
  "institution_id", "institution_name", "issued_by",
  "degree_hash", "certificate_number",
  "status", "blockchain_sync_status",
  "blockchain_tx_hash", "blockchain_block_number", "blockchain_timestamp",
  "revocation_reason", "revoked_at", "revocation_tx_hash",
  "qr_code_url", "ipfs_cid", "ipfs_gateway_url",
  "document_hash", "document_url",
  "created_at", "updated_at",
].join(", ");

const Degree = {

  // ── Create ────────────────────────────────────────────────────────────────
  async create(data) {
    const supabase = getSupabaseAdmin();

    const { data: degree, error } = await supabase
      .from(TABLE)
      .insert({
        student_name:           data.studentName       || data.student_name,
        student_id:             data.studentId         || data.student_id,
        graduate_id:            data.graduateId        || data.graduate_id        || null,
        graduate_email:         data.graduateEmail     || data.graduate_email     || null,
        degree_title:           data.degreeTitle       || data.degree_title,
        field_of_study:         data.fieldOfStudy      || data.field_of_study,
        graduation_date:        data.graduationDate    || data.graduation_date,
        gpa:                    data.gpa               || null,
        honors:                 data.honors            || null,
        metadata:               data.metadata          || {},
        institution_id:         data.institutionId     || data.institution_id,
        institution_name:       data.institutionName   || data.institution_name   || null,
        issued_by:              data.issuedBy          || data.issued_by          || null,
        degree_hash:            data.degreeHash        || data.degree_hash,
        status:                 data.status            || "pending",
        blockchain_sync_status: data.blockchainSyncStatus || "queued",
        created_at:             new Date().toISOString(),
        updated_at:             new Date().toISOString(),
      })
      .select(DEFAULT_COLUMNS)
      .single();

    if (error) throw new Error(`Degree.create failed: ${error.message}`);
    return degree;
  },

  // ── Find by ID ────────────────────────────────────────────────────────────
  async findById(id) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select(DEFAULT_COLUMNS)
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  },

  // ── Find by hash ──────────────────────────────────────────────────────────
  async findByHash(degreeHash) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, degree_hash, status")
      .eq("degree_hash", degreeHash)
      .maybeSingle();

    if (error) return null;
    return data;
  },

  // ── Find by certificate number ────────────────────────────────────────────
  async findByCertNumber(certNumber) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select(
        "degree_title, student_name, graduation_date, " +
        "certificate_number, degree_hash, status, " +
        "blockchain_tx_hash, ipfs_cid, ipfs_gateway_url"
      )
      .eq("certificate_number", certNumber)
      .single();

    if (error) return null;
    return data;
  },

  // ── Find many with filters and pagination ─────────────────────────────────
  async findMany({
    page = 1,
    limit = 10,
    status,
    search,
    institutionId,
    studentId,
  } = {}) {
    const supabase = getSupabaseAdmin();
    const offset   = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from(TABLE)
      .select(DEFAULT_COLUMNS, { count: "exact" });

    if (institutionId) query = query.eq("institution_id", institutionId);
    if (studentId)     query = query.eq("student_id",     studentId);
    if (status)        query = query.eq("status",         status);

    if (search) {
      query = query.or(
        `student_name.ilike.%${search}%,` +
        `student_id.ilike.%${search}%,` +
        `degree_title.ilike.%${search}%,` +
        `field_of_study.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw new Error(`Degree.findMany failed: ${error.message}`);
    return { data: data || [], total: count || 0 };
  },

  // ── Update ────────────────────────────────────────────────────────────────
  async update(id, updates) {
    const supabase = getSupabaseAdmin();
    const payload  = { updated_at: new Date().toISOString() };

    // Map both camelCase and snake_case inputs
    const map = {
      status:                "status",
      blockchainSyncStatus:  "blockchain_sync_status",
      blockchain_sync_status: "blockchain_sync_status",
      blockchainTxHash:      "blockchain_tx_hash",
      blockchain_tx_hash:    "blockchain_tx_hash",
      blockchainBlockNumber: "blockchain_block_number",
      blockchainTimestamp:   "blockchain_timestamp",
      revocationReason:      "revocation_reason",
      revokedAt:             "revoked_at",
      revocationTxHash:      "revocation_tx_hash",
      qrCodeUrl:             "qr_code_url",
      qr_code_url:           "qr_code_url",
      ipfsCid:               "ipfs_cid",
      ipfs_cid:              "ipfs_cid",
      ipfsGatewayUrl:        "ipfs_gateway_url",
      documentHash:          "document_hash",
      gpa:                   "gpa",
      honors:                "honors",
      metadata:              "metadata",
    };

    for (const [key, col] of Object.entries(map)) {
      if (updates[key] !== undefined) payload[col] = updates[key];
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq("id", id)
      .select(DEFAULT_COLUMNS)
      .single();

    if (error) throw new Error(`Degree.update failed: ${error.message}`);
    return data;
  },

  // ── Aggregate stats ───────────────────────────────────────────────────────
  async getStats(institutionId = null) {
    const supabase = getSupabaseAdmin();
    let query = supabase.from(TABLE).select("status, blockchain_sync_status");
    if (institutionId) query = query.eq("institution_id", institutionId);

    const { data, error } = await query;
    if (error) throw new Error(`Degree.getStats failed: ${error.message}`);

    const rows = data || [];
    return {
      total:      rows.length,
      issued:     rows.filter((r) => r.status === "issued").length,
      pending:    rows.filter((r) => r.status === "pending").length,
      revoked:    rows.filter((r) => r.status === "revoked").length,
      queued:     rows.filter((r) => r.blockchain_sync_status === "queued").length,
      processing: rows.filter((r) => r.blockchain_sync_status === "processing").length,
      bcSuccess:  rows.filter((r) => r.blockchain_sync_status === "success").length,
      bcFailed:   rows.filter((r) => r.blockchain_sync_status === "failed").length,
    };
  },

  // ── Get recent degrees for anomaly detection ──────────────────────────────
  async getRecentByInstitution(institutionId, withinMinutes = 60) {
    const supabase = getSupabaseAdmin();
    const since    = new Date(Date.now() - withinMinutes * 60000).toISOString();

    const { data, error } = await supabase
      .from(TABLE)
      .select("id, student_id, blockchain_sync_status, created_at")
      .eq("institution_id", institutionId)
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    if (error) return [];
    return data || [];
  },

  // ── System-wide stats for admin report ───────────────────────────────────
  async getSystemReport() {
    const supabase = getSupabaseAdmin();
    const today    = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from(TABLE)
      .select("status, blockchain_sync_status, created_at");

    if (error) return {};

    const rows = data || [];
    return {
      total:      rows.length,
      today:      rows.filter((r) => r.created_at?.startsWith(today)).length,
      issued:     rows.filter((r) => r.status === "issued").length,
      pending:    rows.filter((r) => r.status === "pending").length,
      revoked:    rows.filter((r) => r.status === "revoked").length,
      bcFailed:   rows.filter((r) => r.blockchain_sync_status === "failed").length,
    };
  },
};

module.exports = Degree;