// /models/Verification.js
// Verification Log Model — Supabase Query Wrapper

const { getSupabaseAdmin } = require("../database/supabase");

const TABLE = "verification_logs";

const Verification = {
  // ── Create ────────────────────────────────────────────────────────────────
  async create(data) {
    const supabase = getSupabaseAdmin();

    const { data: log, error } = await supabase
      .from(TABLE)
      .insert({
        computed_hash:       data.computedHash       || data.computed_hash       || null,
        result:              data.result,
        verifier_id:         data.verifierId         || data.verifier_id         || null,
        verifier_ip:         data.verifierIp         || data.verifier_ip         || null,
        degree_id:           data.degreeId           || data.degree_id           || null,
        verification_method: data.method             || data.verification_method || null,
        on_chain_record:     data.onChainRecord      || {},
        metadata:            data.metadata           || {},
        verified_at:         new Date().toISOString(),
      })
      .select("id, result, verified_at")
      .single();

    if (error) {
      console.warn(`[Verification] Log insert failed (non-fatal): ${error.message}`);
      return null;
    }
    return log;
  },

  // ── Find many with pagination ─────────────────────────────────────────────
  async findMany({ page = 1, limit = 20, result, verifierIp } = {}) {
    const supabase = getSupabaseAdmin();
    const offset   = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from(TABLE)
      .select("*", { count: "exact" });

    if (result)     query = query.eq("result",      result);
    if (verifierIp) query = query.eq("verifier_ip", verifierIp);

    const { data, count, error } = await query
      .order("verified_at", { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw new Error(`Verification.findMany failed: ${error.message}`);
    return { data: data || [], total: count || 0 };
  },

  // ── Get recent by IP (for anomaly detection) ──────────────────────────────
  async getRecentByIp(verifierIp, withinMinutes = 60) {
    const supabase = getSupabaseAdmin();
    const since    = new Date(Date.now() - withinMinutes * 60000).toISOString();

    const { data, error } = await supabase
      .from(TABLE)
      .select("id, computed_hash, result, verified_at")
      .eq("verifier_ip", verifierIp)
      .gte("verified_at", since);

    if (error) return [];
    return data || [];
  },

  // ── System report stats ───────────────────────────────────────────────────
  async getSystemReport() {
    const supabase = getSupabaseAdmin();
    const today    = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from(TABLE)
      .select("result, verified_at");

    if (error) return {};
    const rows = data || [];

    return {
      total:    rows.length,
      today:    rows.filter((r) => r.verified_at?.startsWith(today)).length,
      valid:    rows.filter((r) => r.result === "valid").length,
      invalid:  rows.filter((r) => r.result === "invalid").length,
      revoked:  rows.filter((r) => r.result === "revoked").length,
      successRate:
        rows.length > 0
          ? ((rows.filter((r) => r.result === "valid").length / rows.length) * 100).toFixed(1)
          : "0.0",
    };
  },

  // ── Find by ID ────────────────────────────────────────────────────────────
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

  // ── Find by verification code ────────────────────────────────────────────
  // Assumes a column "code" (or "verification_code") exists in the table.
  async findByCode(code) {
    const supabase = getSupabaseAdmin();
    // Try multiple possible column names (adjust to your actual schema)
    let { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error && error.message.includes("column")) {
      // fallback to "verification_code" if "code" not found
      const result = await supabase
        .from(TABLE)
        .select("*")
        .eq("verification_code", code)
        .maybeSingle();
      return result.data || null;
    }

    if (error) return null;
    return data;
  },

  // ── Update by ID ──────────────────────────────────────────────────────────
  async update(id, updates) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(`Verification.update failed: ${error.message}`);
    return data;
  },

  // ── Find by degree ID ────────────────────────────────────────────────────
  async findByDegree(degreeId) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("degree_id", degreeId)
      .order("verified_at", { ascending: false });

    if (error) return [];
    return data || [];
  },
};

module.exports = Verification;