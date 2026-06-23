// BACKEND/models/Verification.js
//
// FIXES applied (Audit Report §7):
//   FIX-1: TABLE changed from 'verification_logs' → 'verifications'
//          (new table per Section 4.2 — see also migration File 7)
//   FIX-2: create() now maps every field the verificationController passes
//          (requested_by, requester_email, requester_organization, purpose,
//           ip_address, user_agent, verification_code, status, expires_at)
//   FIX-3: findAll() added as alias for findMany() — controller calls findAll()
//   FIX-4: getStats() added — controller calls Verification.getStats(userId)
//   FIX-5: findByCode() now queries the correct 'verification_code' column
//   FIX-6: update() kept and hardened
//   FIX-7: findMany() supports status + requestedBy filters used by controller

const { getSupabaseAdmin } = require('../database/supabase');
const crypto = require('crypto');

// FIX-1: new table name per Section 4.2 schema
const TABLE = 'verifications';

/**
 * Generates a unique 12-character verification code.
 * Format: XXXX-XXXX-XXXX (uppercase alphanumeric, URL-safe)
 */
function generateVerificationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let code = '';
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    code += chars[bytes[i] % chars.length];
    if (i === 3 || i === 7) code += '-';
  }
  return code;
}

const Verification = {

  // ── Create ──────────────────────────────────────────────────────────────────
  // FIX-2: maps all fields that verificationController.js passes
  async create(data) {
    const supabase = getSupabaseAdmin();

    const expiresAt = data.expires_at
      || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // default 7 days

    const { data: record, error } = await supabase
      .from(TABLE)
      .insert({
        degree_id:                 data.degree_id               || null,
        requested_by:              data.requested_by            || null,
        requester_email:           data.requester_email         || null,
        requester_organization:    data.requester_organization  || null,
        purpose:                   data.purpose                 || null,
        status:                    data.status                  || 'pending',
        verification_code:         data.verification_code       || generateVerificationCode(),
        blockchain_verified:       data.blockchain_verified     ?? null,
        document_verified:         data.document_verified       ?? null,
        fraud_check_passed:        data.fraud_check_passed      ?? null,
        fraud_score:               data.fraud_score             ?? null,
        verification_result:       data.verification_result     || null,
        ip_address:                data.ip_address              || null,
        user_agent:                data.user_agent              || null,
        expires_at:                expiresAt,
        verified_at:               data.verified_at             || null,
        notes:                     data.notes                   || null,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Verification.create failed: ${error.message}`);
    }
    return record;
  },

  // ── findMany (core paginated query) ────────────────────────────────────────
  // FIX-7: supports status + requestedBy filters
  async findMany({ page = 1, limit = 20, status, requestedBy } = {}) {
    const supabase = getSupabaseAdmin();
    const offset   = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from(TABLE)
      .select('*', { count: 'exact' });

    if (status)      query = query.eq('status',       status);
    if (requestedBy) query = query.eq('requested_by', requestedBy);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw new Error(`Verification.findMany failed: ${error.message}`);
    return {
      data:  data  || [],
      total: count || 0,
      page:  parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    };
  },

  // ── FIX-3: findAll() — alias used by verificationController.getAllVerifications
  async findAll(opts) {
    return this.findMany(opts);
  },

  // ── findById ────────────────────────────────────────────────────────────────
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

  // ── FIX-5: findByCode() — queries 'verification_code' column (correct column name)
  async findByCode(code) {
    const supabase = getSupabaseAdmin();
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

  // ── FIX-6: update() ─────────────────────────────────────────────────────────
  async update(id, updates) {
    const supabase = getSupabaseAdmin();

    // Prevent accidental id overwrite
    const { id: _drop, ...safeUpdates } = updates;

    const { data, error } = await supabase
      .from(TABLE)
      .update(safeUpdates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(`Verification.update failed: ${error.message}`);
    return data;
  },

  // ── FIX-4: getStats() ───────────────────────────────────────────────────────
  // Called by verificationController.getVerificationStats(userId)
  async getStats(userId = null) {
    const supabase = getSupabaseAdmin();
    const today    = new Date().toISOString().split('T')[0];

    let query = supabase.from(TABLE).select('status, blockchain_verified, created_at');
    if (userId) query = query.eq('requested_by', userId);

    const { data, error } = await query;
    if (error) throw new Error(`Verification.getStats failed: ${error.message}`);

    const rows = data || [];

    return {
      total:              rows.length,
      today:              rows.filter(r => r.created_at?.startsWith(today)).length,
      pending:            rows.filter(r => r.status === 'pending').length,
      verified:           rows.filter(r => r.status === 'verified').length,
      rejected:           rows.filter(r => r.status === 'rejected').length,
      flagged:            rows.filter(r => r.status === 'flagged').length,
      blockchainVerified: rows.filter(r => r.blockchain_verified === true).length,
      successRate:
        rows.length > 0
          ? ((rows.filter(r => r.status === 'verified').length / rows.length) * 100).toFixed(1)
          : '0.0',
    };
  },

  // ── findByDegree (utility) ──────────────────────────────────────────────────
  async findByDegree(degreeId) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('degree_id', degreeId)
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  },

  // ── getRecentByIp (anomaly detection) ──────────────────────────────────────
  async getRecentByIp(ipAddress, withinMinutes = 60) {
    const supabase = getSupabaseAdmin();
    const since = new Date(Date.now() - withinMinutes * 60000).toISOString();

    const { data, error } = await supabase
      .from(TABLE)
      .select('id, verification_code, status, created_at')
      .eq('ip_address', ipAddress)
      .gte('created_at', since);

    if (error) return [];
    return data || [];
  },
};

module.exports = Verification;