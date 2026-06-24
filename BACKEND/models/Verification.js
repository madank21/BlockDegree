// BACKEND/models/Verification.js
//
// FIXES applied (re-verified against the ACTUAL current database schema):
//   FIX-1 (CRITICAL): TABLE was 'verifications' — that table was never
//          created. migrations/002_initial_schema.sql instead patched the
//          EXISTING verification_logs table with verification_code,
//          status, blockchain_verified, document_verified,
//          fraud_check_passed, fraud_score, verification_result,
//          requester_email, requester_organization, requested_by, purpose,
//          ip_address, user_agent, notes, updated_at, expires_at — a
//          complete superset of what this model needs. Every single
//          method here was throwing "relation verifications does not
//          exist". Changed TABLE to 'verification_logs'.
//   FIX-2: verification_logs has no created_at column (only verified_at,
//          which IS NOT NULL DEFAULT NOW() — set automatically on every
//          insert, so it works as the creation timestamp). findMany(),
//          getStats(), and getRecentByIp() all referenced the
//          non-existent created_at; switched to verified_at.
//   FIX-3: verification_logs.result is NOT NULL with no default (legacy
//          column from the old hash-check-log workflow: 'valid'/'invalid'/
//          'revoked'). create() never sets it, because the new
//          request-lifecycle workflow doesn't know the result yet at
//          creation time (status starts 'pending'). Paired with migration
//          003_patches.sql, which drops the NOT NULL constraint on result
//          — it's simply unused by the new workflow and stays NULL.
//   (FIX numbering for findAll/getStats/findByCode/update kept from the
//    previous pass — those were already correct once the table existed.)

const { getSupabaseAdmin } = require('../database/supabase');
const crypto = require('crypto');

// FIX-1: this is the table that actually exists (patched in migration 002),
// not 'verifications'.
const TABLE = 'verification_logs';

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
        // FIX-3: `result` (legacy, NOT NULL) deliberately left unset —
        // migration 003_patches.sql drops its NOT NULL constraint. The new
        // request-lifecycle workflow uses `status` instead.
        notes:                     data.notes                   || null,
        // verified_at intentionally NOT set here — it defaults to NOW() at
        // the DB level and doubles as this row's creation timestamp
        // (FIX-2). It gets overwritten with the real completion time later
        // via update({ verified_at, status: 'verified'|'rejected' }).
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Verification.create failed: ${error.message}`);
    }
    return record;
  },

  // ── findMany (core paginated query) ────────────────────────────────────────
  async findMany({ page = 1, limit = 20, status, requestedBy } = {}) {
    const supabase = getSupabaseAdmin();
    const offset   = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from(TABLE)
      .select('*', { count: 'exact' });

    if (status)      query = query.eq('status',       status);
    if (requestedBy) query = query.eq('requested_by', requestedBy);

    // FIX-2: order by verified_at (exists, NOT NULL) — created_at does not
    // exist on verification_logs.
    const { data, count, error } = await query
      .order('verified_at', { ascending: false })
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

  // ── findAll() — alias used by verificationController.getAllVerifications ────
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

  // ── findByCode() — queries the 'verification_code' column ──────────────────
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

  // ── update() ─────────────────────────────────────────────────────────────────
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

  // ── getStats() ────────────────────────────────────────────────────────────────
  // Called by verificationController.getVerificationStats(userId)
  async getStats(userId = null) {
    const supabase = getSupabaseAdmin();
    const today    = new Date().toISOString().split('T')[0];

    // FIX-2: select verified_at, not the non-existent created_at.
    let query = supabase.from(TABLE).select('status, blockchain_verified, verified_at');
    if (userId) query = query.eq('requested_by', userId);

    const { data, error } = await query;
    if (error) throw new Error(`Verification.getStats failed: ${error.message}`);

    const rows = data || [];

    return {
      total:              rows.length,
      today:              rows.filter(r => r.verified_at?.startsWith(today)).length,
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

  // ── findByDegree (utility) ────────────────────────────────────────────────────
  async findByDegree(degreeId) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('degree_id', degreeId)
      .order('verified_at', { ascending: false }); // FIX-2

    if (error) return [];
    return data || [];
  },

  // ── getRecentByIp (anomaly detection) ────────────────────────────────────────
  async getRecentByIp(ipAddress, withinMinutes = 60) {
    const supabase = getSupabaseAdmin();
    const since = new Date(Date.now() - withinMinutes * 60000).toISOString();

    const { data, error } = await supabase
      .from(TABLE)
      .select('id, verification_code, status, verified_at')
      .eq('ip_address', ipAddress)
      .gte('verified_at', since); // FIX-2

    if (error) return [];
    return data || [];
  },
};

module.exports = Verification;