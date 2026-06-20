// /models/Document.js
// IPFS Document Model — Supabase Query Wrapper

const { getSupabaseAdmin } = require("../database/supabase");

const TABLE = "ipfs_documents";

const Document = {
  // ── Create ────────────────────────────────────────────────────────────────
  async create(data) {
    const supabase = getSupabaseAdmin();

    const { data: doc, error } = await supabase
      .from(TABLE)
      .insert({
        degree_id:     data.degreeId     || data.degree_id     || null,
        user_id:       data.userId       || data.user_id       || null,
        cid:           data.cid,
        local_hash:    data.localHash    || data.local_hash,
        gateway_url:   data.gatewayUrl   || data.gateway_url   || null,
        pinata_url:    data.pinataUrl    || data.pinata_url    || null,
        file_size:     data.fileSize     || data.file_size     || null,
        file_type:     data.fileType     || data.file_type     || null,
        document_type: data.documentType || data.document_type || "degree",
        is_pinned:     data.isPinned     !== undefined ? data.isPinned : true,
        created_at:    new Date().toISOString(),
      })
      .select("id, cid, gateway_url, document_type, created_at")
      .single();

    if (error) throw new Error(`Document.create failed: ${error.message}`);
    return doc;
  },

  // ── Find by degree ID ────────────────────────────────────────────────────
  async findByDegreeId(degreeId) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("degree_id", degreeId)
      .order("created_at", { ascending: false });

    if (error) return [];
    return data || [];
  },

  // ── Find by CID ──────────────────────────────────────────────────────────
  async findByCID(cid) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("cid", cid)
      .single();

    if (error) return null;
    return data;
  },

  // ── Find by ID ───────────────────────────────────────────────────────────
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

  // ── Find by local hash ──────────────────────────────────────────────────
  async findByHash(localHash) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("local_hash", localHash)
      .single(); // assuming unique; if multiple, use .maybeSingle() or return array

    if (error) return null;
    return data;
  },

  // ── Find all with pagination ────────────────────────────────────────────
  async findAll({ page = 1, limit = 20, degreeId = null, documentType = null } = {}) {
    const supabase = getSupabaseAdmin();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase.from(TABLE).select("*", { count: "exact" });

    if (degreeId)     query = query.eq("degree_id", degreeId);
    if (documentType) query = query.eq("document_type", documentType);

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw new Error(`Document.findAll failed: ${error.message}`);
    return { data: data || [], total: count || 0 };
  },

  // ── Update by ID ─────────────────────────────────────────────────────────
  async update(id, updates) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(`Document.update failed: ${error.message}`);
    return data;
  },

  // ── Delete by ID ─────────────────────────────────────────────────────────
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