const { getSupabaseAdmin } = require("../database/supabase");
const TABLE = "ipfs_documents";

const Document = {
  async create(data) {
    const supabase = getSupabaseAdmin();
    const { data: doc, error } = await supabase
      .from(TABLE)
      .insert({
        degree_id:     data.degreeId || data.degree_id || null,
        user_id:       data.userId || data.user_id || null,
        cid:           data.cid,
        local_hash:    data.localHash || data.local_hash,
        gateway_url:   data.gatewayUrl || data.gateway_url || null,
        pinata_url:    data.pinataUrl || data.pinata_url || null,
        file_size:     data.fileSize || data.file_size || null,
        file_type:     data.fileType || data.file_type || null,
        document_type: data.documentType || data.document_type || "degree",
        is_pinned:     data.isPinned !== undefined ? data.isPinned : true,
        created_at:    new Date().toISOString(),
      })
      .select("id, cid, gateway_url, created_at")
      .single();
    if (error) throw new Error(`Document.create failed: ${error.message}`);
    return doc;
  },

  async findByDegreeId(degreeId) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from(TABLE).select("*").eq("degree_id", degreeId).order("created_at", { ascending: false });
    if (error) return [];
    return data || [];
  },

  async findByCID(cid) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from(TABLE).select("*").eq("cid", cid).single();
    if (error) return null;
    return data;
  },
};

module.exports = Document;