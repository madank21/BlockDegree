// BACKEND/models/Document.js
const { getSupabaseAdmin } = require("../database/supabase");
const crypto = require("crypto");
const fs = require("fs");

const TABLE = "documents";  // dedicated table for uploaded documents

const Document = {
  // ── Generate SHA‑256 hash of file ──────────────────────────────────────────
  generateFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  },

  // ── Create a document record ──────────────────────────────────────────────
  async create(data) {
    const supabase = getSupabaseAdmin();
    const { data: doc, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: data.user_id || data.userId,
        degree_id: data.degree_id || data.degreeId || null,
        document_type: data.document_type || data.documentType || "degree",
        file_name: data.file_name || data.fileName,
        original_name: data.original_name || data.originalName,
        file_path: data.file_path || data.filePath,
        file_url: data.file_url || data.fileUrl,
        file_size: data.file_size || data.fileSize,
        mime_type: data.mime_type || data.mimeType,
        file_hash: data.file_hash || data.fileHash,
        ocr_data: data.ocr_data || data.ocrData || {},
        ocr_confidence: data.ocr_confidence || data.ocrConfidence || 0,
        fraud_score: data.fraud_score || data.fraudScore || 0,
        is_verified: data.is_verified !== undefined ? data.is_verified : false,
        verification_notes: data.verification_notes || data.verificationNotes || "",
        // ── New fields for frontend statuses and extracted data ──
        ocr_status: data.ocr_status || data.ocrStatus || 'pending',
        yolo_status: data.yolo_status || data.yoloStatus || 'pending',
        validation_status: data.validation_status || data.validationStatus || 'pending',
        ocr_text: data.ocr_text || data.ocrText || null,
        extracted_data: data.extracted_data || data.extractedData || {},
        yolo_detections: data.yolo_detections || data.yoloDetections || [],
        yolo_valid: data.yolo_valid !== undefined ? data.yolo_valid : null,
        yolo_confidence: data.yolo_confidence || data.yoloConfidence || null,
        validation_errors: data.validation_errors || data.validationErrors || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw new Error(`Document.create failed: ${error.message}`);
    return doc;
  },

  // ── Find by ID ──────────────────────────────────────────────────────────────
  async findById(id) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  },

  // ── Find by file hash (unique) ────────────────────────────────────────────
  async findByHash(hash) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("file_hash", hash)
      .maybeSingle();

    if (error) return null;
    return data;
  },

  // ── Find by user ID (paginated) ───────────────────────────────────────────
  async findByUser(userId, { page = 1, limit = 10, documentType = null } = {}) {
    const supabase = getSupabaseAdmin();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from(TABLE)
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    if (documentType) {
      query = query.eq("document_type", documentType);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw new Error(`Document.findByUser failed: ${error.message}`);
    return { data: data || [], total: count || 0, page, limit };
  },

  // ── Find all (admin) with filters ──────────────────────────────────────────
  async findAll({ page = 1, limit = 20, isVerified = null, fraudScoreMin = null } = {}) {
    const supabase = getSupabaseAdmin();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase.from(TABLE).select("*", { count: "exact" });

    if (isVerified !== null) {
      query = query.eq("is_verified", isVerified);
    }
    if (fraudScoreMin !== null) {
      query = query.gte("fraud_score", parseFloat(fraudScoreMin));
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw new Error(`Document.findAll failed: ${error.message}`);
    return { data: data || [], total: count || 0, page, limit };
  },

  // ── Find by degree ID ──────────────────────────────────────────────────────
  async findByDegree(degreeId) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("degree_id", degreeId)
      .order("created_at", { ascending: false });

    if (error) return [];
    return data || [];
  },

  // ── Update by ID (generic, can update any column) ──────────────────────────
  async update(id, updates) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(`Document.update failed: ${error.message}`);
    return data;
  },

  // ── Delete by ID ────────────────────────────────────────────────────────────
  async delete(id) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Document.delete failed: ${error.message}`);
    return { success: true };
  },
};

module.exports = Document;