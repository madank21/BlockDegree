// /models/AuditLog.js — Supabase version

const { getSupabaseAdmin } = require("../database/supabase");

const TABLE = "audit_logs";

const AuditLog = {

  async create(data) {
    const supabase = getSupabaseAdmin();
    const { data: log, error } = await supabase
      .from(TABLE)
      .insert({
        action:      data.action,
        actor_id:    data.actorId    || data.actor_id    || null,
        actor_role:  data.actorRole  || data.actor_role  || null,
        target_id:   data.targetId   ? String(data.targetId)  : null,
        target_type: data.targetType || data.target_type || null,
        details:     data.details    || {},
        ip_address:  data.ipAddress  || data.ip_address  || null,
        created_at:  new Date().toISOString(),
      })
      .select("id, action, created_at")
      .single();

    if (error) {
      // Non-fatal — audit log failure must not break main flow
      console.warn(`[AuditLog] Insert failed: ${error.message}`);
      return null;
    }
    return log;
  },

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
};

module.exports = AuditLog;