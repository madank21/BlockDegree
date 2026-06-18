// /models/Verification.js — Supabase version

const { getSupabaseAdmin } = require("../database/supabase");

const TABLE = "verification_logs";

const Verification = {

  async create(data) {
    const supabase = getSupabaseAdmin();
    const { data: log, error } = await supabase
      .from(TABLE)
      .insert({
        computed_hash:       data.computedHash  || data.computed_hash  || null,
        result:              data.result,
        verifier_id:         data.verifierId    || data.verifier_id    || null,
        verifier_ip:         data.verifierIp    || data.verifier_ip    || null,
        degree_id:           data.degreeId      || data.degree_id      || null,
        verification_method: data.method        || data.verification_method || null,
        on_chain_record:     data.onChainRecord || {},
        metadata:            data.metadata      || {},
        verified_at:         new Date().toISOString(),
      })
      .select("id, result, verified_at")
      .single();

    if (error) {
      console.warn(`[Verification] Log insert failed: ${error.message}`);
      return null;
    }
    return log;
  },

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

  // For anomaly detection — recent verifications from an IP
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
};

module.exports = Verification;