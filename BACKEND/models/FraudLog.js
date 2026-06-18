// /models/FraudLog.js
// Fraud Log Model — Supabase Query Wrapper

const { getSupabaseAdmin } = require("../database/supabase");

const TABLE = "fraud_logs";

const FraudLog = {

  // ── Create ────────────────────────────────────────────────────────────────
  async create(data) {
    const supabase = getSupabaseAdmin();

    const { data: log, error } = await supabase
      .from(TABLE)
      .insert({
        file_name:       data.fileName       || null,
        file_hash:       data.fileHash       || null,
        fraud_score:     data.fraudScore     || 0,
        risk_level:      data.riskLevel      || "MINIMAL",
        is_fraudulent:   data.isFraudulent   || false,
        findings:        data.findings       || [],
        breakdown:       data.breakdown      || {},
        yolo_detections: data.yoloDetections || {},
        ocr_confidence:  data.ocrConfidence  || null,
        reported_by:     data.reportedBy     || null,
        degree_id:       data.degreeId       || null,
        created_at:      new Date().toISOString(),
      })
      .select("id, fraud_score, risk_level, is_fraudulent, created_at")
      .single();

    if (error) {
      console.warn(`[FraudLog] Insert failed (non-fatal): ${error.message}`);
      return null;
    }
    return log;
  },

  // ── Find many ─────────────────────────────────────────────────────────────
  async findMany({ page = 1, limit = 20, isFraudulent, riskLevel } = {}) {
    const supabase = getSupabaseAdmin();
    const offset   = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from(TABLE)
      .select("*", { count: "exact" });

    if (isFraudulent !== undefined) query = query.eq("is_fraudulent", isFraudulent);
    if (riskLevel)                  query = query.eq("risk_level",    riskLevel);

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw new Error(`FraudLog.findMany failed: ${error.message}`);
    return { data: data || [], total: count || 0 };
  },

  // ── Summary stats ─────────────────────────────────────────────────────────
  async getStats() {
    const supabase = getSupabaseAdmin();
    const today    = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from(TABLE)
      .select("risk_level, is_fraudulent, created_at");

    if (error) return {};
    const rows = data || [];

    return {
      total:     rows.length,
      today:     rows.filter((r) => r.created_at?.startsWith(today)).length,
      critical:  rows.filter((r) => r.risk_level === "CRITICAL").length,
      high:      rows.filter((r) => r.risk_level === "HIGH").length,
      confirmed: rows.filter((r) => r.is_fraudulent).length,
    };
  },
};

module.exports = FraudLog;