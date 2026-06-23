// BACKEND/models/Verification.js
// ─────────────────────────────────────────────────────────────────────────────
// Verification Model — Supabase Query Wrapper
// FIXES:
//   - Added findAll() method (was missing, used by verificationController)
//   - Added getStats() method (called by verificationController/routes)
//   - findByCode() now targets `verification_code` column (correct DB column name)
//   - Added count() helper
// ─────────────────────────────────────────────────────────────────────────────

const { getSupabaseAdmin } = require('../database/supabase');

const TABLE = 'verification_logs';

const Verification = {

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(data) {
    const supabase = getSupabaseAdmin();

    const { data: log, error } = await supabase
      .from(TABLE)
      .insert({
        computed_hash:        data.computedHash        || data.computed_hash        || null,
        result:               data.result,
        verifier_id:          data.verifierId          || data.verifier_id          || null,
        verifier_ip:          data.verifierIp          || data.verifier_ip          || null,
        degree_id:            data.degreeId            || data.degree_id            || null,
        verification_method:  data.method              || data.verification_method  || null,
        on_chain_record:      data.onChainRecord       || data.on_chain_record      || {},
        metadata:             data.metadata            || {},
        verified_at:          new Date().toISOString(),
      })
      .select('id, result, degree_id, verified_at')
      .single();

    if (error) {
      console.warn(`[Verification] Log insert failed (non-fatal): ${error.message}`);
      return null;
    }
    return log;
  },

  // ── Find Many (paginated) ──────────────────────────────────────────────────
  async findMany({ page = 1, limit = 20, result, verifierIp, degreeId } = {}) {
    const supabase = getSupabaseAdmin();
    const offset   = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from(TABLE)
      .select('*', { count: 'exact' });

    if (result)     query = query.eq('result',      result);
    if (verifierIp) query = query.eq('verifier_ip', verifierIp);
    if (degreeId)   query = query.eq('degree_id',   degreeId);

    const { data, count, error } = await query
      .order('verified_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw new Error(`Verification.findMany failed: ${error.message}`);
    return { data: data || [], total: count || 0 };
  },

  // ── Find All (no pagination — for exports / stats) ─────────────────────────
  // FIX: This method was missing. It was called from verificationController.
  async findAll({ limit = 10000 } = {}) {
    const supabase = getSupabaseAdmin();

    const { data, count, error } = await supabase
      .from(TABLE)
      .select('*', { count: 'exact' })
      .order('verified_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Verification.findAll failed: ${error.message}`);
    return { data: data || [], total: count || 0 };
  },

  // ── Count ─────────────────────────────────────────────────────────────────
  async count(filters = {}) {
    const supabase = getSupabaseAdmin();
    let query = supabase.from(TABLE).select('*', { count: 'exact', head: true });

    if (filters.result)     query = query.eq('result',    filters.result);
    if (filters.verifierIp) query = query.eq('verifier_ip', filters.verifierIp);

    const { count, error } = await query;
    if (error) throw new Error(`Verification.count failed: ${error.message}`);
    return count || 0;
  },

  // ── Get Stats ──────────────────────────────────────────────────────────────
  // FIX: This method was missing. Called by verificationController getStats route.
  async getStats() {
    const supabase = getSupabaseAdmin();
    const today    = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from(TABLE)
      .select('result, verified_at');

    if (error) return {};
    const rows = data || [];

    const valid   = rows.filter((r) => r.result === 'valid').length;
    const invalid = rows.filter((r) => r.result === 'invalid').length;
    const revoked = rows.filter((r) => r.result === 'revoked').length;
    const total   = rows.length;

    return {
      total,
      today:       rows.filter((r) => r.verified_at?.startsWith(today)).length,
      valid,
      invalid,
      revoked,
      successRate: total > 0 ? ((valid / total) * 100).toFixed(1) : '0.0',
    };
  },

  // ── Get recent by IP (anomaly detection) ──────────────────────────────────
  async getRecentByIp(verifierIp, withinMinutes = 60) {
    const supabase = getSupabaseAdmin();
    const since    = new Date(Date.now() - withinMinutes * 60000).toISOString();

    const { data, error } = await supabase
      .from(TABLE)
      .select('id, computed_hash, result, verified_at')
      .eq('verifier_ip', verifierIp)
      .gte('verified_at', since);

    if (error) return [];
    return data || [];
  },

  // ── System report ─────────────────────────────────────────────────────────
  async getSystemReport() {
    return this.getStats();
  },

  // ── Find by ID ────────────────────────────────────────────────────────────
  async findById(id) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  },

  // ── Find by Verification Code ─────────────────────────────────────────────
  // FIX: Query uses `verification_code` column (not `code` which doesn't exist).
  async findByCode(code) {
    const supabase = getSupabaseAdmin();

    // Try `verification_code` first (the actual column per schema)
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('verification_code', code)
      .maybeSingle();

    if (error) {
      console.warn(`[Verification] findByCode error: ${error.message}`);
      return null;
    }
    return data || null;
  },

  // ── Update by ID ──────────────────────────────────────────────────────────
  async update(id, updates) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(`Verification.update failed: ${error.message}`);
    return data;
  },

  // ── Find by Degree ID ─────────────────────────────────────────────────────
  async findByDegree(degreeId) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('degree_id', degreeId)
      .order('verified_at', { ascending: false });

    if (error) return [];
    return data || [];
  },
};

module.exports = Verification;