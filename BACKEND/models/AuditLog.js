// /models/AuditLog.js
// Audit Log Model — Supabase Query Wrapper

const { getSupabaseAdmin } = require("../database/supabase");

const TABLE = "audit_logs";

const AuditLog = {

  // ── Create (non-fatal — never throws) ────────────────────────────────────
  async create(data) {
    const supabase = getSupabaseAdmin();

    const { data: log, error } = await supabase
      .from(TABLE)
      .insert({
        action:      data.action,
        actor_id:    data.actorId    || data.actor_id    || null,
        actor_role:  data.actorRole  || data.actor_role  || null,
        target_id:   data.targetId   ? String(data.targetId) : null,
        target_type: data.targetType || data.target_type || null,
        details:     data.details    || {},
        ip_address:  data.ipAddress  || data.ip_address  || null,
        created_at:  new Date().toISOString(),
      })
      .select("id, action, created_at")
      .single();

    if (error) {
      // Audit log failure must NEVER break the main request flow
      console.warn(`[AuditLog] Insert failed (non-fatal): ${error.message}`);
      return null;
    }
    return log;
  },

  // ── Find many with pagination ─────────────────────────────────────────────
  async findMany({ page = 1, limit = 20, action, actorId } = {}) {
    const supabase = getSupabaseAdmin();
    const offset   = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from(TABLE)
      .select("*", { count: "exact" });

    if (action)  query = query.eq("action",   action);
    if (actorId) query = query.eq("actor_id", actorId);

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw new Error(`AuditLog.findMany failed: ${error.message}`);
    return { data: data || [], total: count || 0 };
  },

  // ── Get today's count ─────────────────────────────────────────────────────
  async getTodayCount() {
    const supabase = getSupabaseAdmin();
    const today    = new Date().toISOString().split("T")[0];

    const { count, error } = await supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00.000Z`);

    if (error) return 0;
    return count || 0;
  },

  // ── NEW: Static `log` method (compatible with controller calls) ──────────
  async log(action, data) {
    // Transform the parameters into the shape expected by `create`
    return await this.create({
      action,
      actorId:    data.userId,            // controller passes `userId`
      actorRole:  data.userRole || null,  // optional, not used in controller
      targetId:   data.resourceId,
      targetType: data.resourceType,
      details:    {
        oldData: data.oldData || null,
        newData: data.newData || null,
      },
      ipAddress:  data.ipAddress || null,
    });
  },
};

module.exports = AuditLog;