// BACKEND/models/FraudLog.js
// Fraud Log Model — Supabase Query Wrapper
//
// FIXES applied (re-verified against the ACTUAL current database schema):
//   FIX-1: is_resolved column did not exist anywhere in the schema.
//          002_initial_schema.sql explicitly chose NOT to add it (its own
//          comment says "No structural change needed — is_fraudulent
//          already in schema"), but this model selects/filters/updates
//          is_resolved in create(), findMany(), count(), getStats(), and
//          update() — every one of those calls was throwing
//          'column fraud_logs.is_resolved does not exist'. Added the
//          column via migration 003_patches.sql (delivered alongside this
//          file) — the queries below are unchanged because they were
//          already correct; the column just needed to exist.
//   FIX-2: getStats() was missing a `low` risk-level count, which
//          fraudController.getStats() needs for FraudStats.lowCount.

const { getSupabaseAdmin } = require('../database/supabase');

const TABLE = 'fraud_logs';

const FraudLog = {

  // ── Create ──────────────────────────────────────────────────────────────────
  async create(data) {
    const supabase = getSupabaseAdmin();

    const { data: log, error } = await supabase
      .from(TABLE)
      .insert({
        file_name:       data.fileName       || data.file_name       || null,
        file_hash:       data.fileHash       || data.file_hash       || null,
        fraud_score:     data.fraudScore     ?? data.fraud_score     ?? 0,
        risk_level:      data.riskLevel      || data.risk_level      || 'MINIMAL',
        is_fraudulent:   data.isFraudulent   ?? data.is_fraudulent   ?? false,
        findings:        data.findings       || [],
        breakdown:       data.breakdown      || {},
        yolo_detections: data.yoloDetections || data.yolo_detections || {},
        ocr_confidence:  data.ocrConfidence  ?? data.ocr_confidence  ?? null,
        reported_by:     data.reportedBy     || data.reported_by     || null,
        degree_id:       data.degreeId       || data.degree_id       || null,
        is_resolved:     false,   // FIX-1: column now exists (migration 003)
        resolved_at:     null,
        created_at:      new Date().toISOString(),
      })
      .select('id, fraud_score, risk_level, is_fraudulent, created_at')
      .single();

    if (error) {
      console.warn(`[FraudLog] Insert failed (non-fatal): ${error.message}`);
      return null;
    }
    return log;
  },

  // ── findMany (core paginated query) ─────────────────────────────────────────
  async findMany({ page = 1, limit = 20, isFraudulent, riskLevel, resolved } = {}) {
    const supabase = getSupabaseAdmin();
    const offset   = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from(TABLE)
      .select('*', { count: 'exact' });

    if (isFraudulent !== undefined) query = query.eq('is_fraudulent', isFraudulent);
    if (riskLevel)                  query = query.eq('risk_level',    riskLevel);
    if (resolved !== undefined)     query = query.eq('is_resolved',   resolved); // FIX-1

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw new Error(`FraudLog.findMany failed: ${error.message}`);
    return {
      data:  data  || [],
      total: count || 0,
      page:  parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    };
  },

  // ── findAll — alias used by fraudController/adminController ─────────────────
  async findAll(opts) {
    const { where = {}, ...rest } = opts || {};
    const mapped = {
      ...rest,
      resolved:     where.resolved,
      isFraudulent: where.isFraudulent,
      riskLevel:    where.riskLevel || where.severity,
    };
    const result = await this.findMany({ ...mapped, limit: rest.limit || 9999 });
    return result.data;
  },

  // ── findById ──────────────────────────────────────────────────────────────
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

  // ── update ────────────────────────────────────────────────────────────────
  async update(id, updates) {
    const supabase = getSupabaseAdmin();

    const payload = {};
    if (updates.isResolved !== undefined) payload.is_resolved = updates.isResolved;
    if (updates.resolved   !== undefined) payload.is_resolved = updates.resolved;
    if (updates.resolvedAt !== undefined) payload.resolved_at = updates.resolvedAt;
    if (updates.resolved_at !== undefined) payload.resolved_at = updates.resolved_at;
    if (updates.notes      !== undefined) payload.notes       = updates.notes;
    for (const [k, v] of Object.entries(updates)) {
      if (!['isResolved', 'resolved', 'resolvedAt', 'notes'].includes(k)) {
        payload[k] = v;
      }
    }
    delete payload.id; // never allow id to be overwritten via a stray key

    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new Error(`FraudLog.update failed: ${error.message}`);
    return data;
  },

  // ── count ─────────────────────────────────────────────────────────────────
  async count(filters = {}) {
    const supabase = getSupabaseAdmin();
    let query = supabase.from(TABLE).select('*', { count: 'exact', head: true });

    if (filters.isFraudulent !== undefined) query = query.eq('is_fraudulent', filters.isFraudulent);
    if (filters.riskLevel)                  query = query.eq('risk_level',    filters.riskLevel);
    if (filters.resolved    !== undefined)  query = query.eq('is_resolved',   filters.resolved); // FIX-1

    const { count, error } = await query;
    if (error) throw new Error(`FraudLog.count failed: ${error.message}`);
    return count || 0;
  },

  // ── Summary stats ───────────────────────────────────────────────────────────
  // FIX-2: added `low` (was missing — fraudController.getStats() needs it
  // for FraudStats.lowCount).
  async getStats() {
    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from(TABLE)
      .select('risk_level, is_fraudulent, is_resolved, created_at');

    if (error) return {};
    const rows = data || [];

    return {
      total:      rows.length,
      today:      rows.filter(r => r.created_at?.startsWith(today)).length,
      critical:   rows.filter(r => r.risk_level === 'CRITICAL').length,
      high:       rows.filter(r => r.risk_level === 'HIGH').length,
      medium:     rows.filter(r => r.risk_level === 'MEDIUM').length,
      low:        rows.filter(r => r.risk_level === 'LOW').length,       // FIX-2
      confirmed:  rows.filter(r => r.is_fraudulent).length,
      resolved:   rows.filter(r => r.is_resolved).length,
      unresolved: rows.filter(r => !r.is_resolved).length,
    };
  },
};

module.exports = FraudLog;