const { supabaseAdmin } = require('../database/supabase');

class AuditLog {
  static TABLE = 'audit_logs';

  // ─── Create ───────────────────────────────────────────────────────────────
  static async create(logData) {
    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .insert([logData])
      .select()
      .single();

    if (error) {
      console.error('Audit log creation failed:', error.message);
      return null;
    }
    return data;
  }

  // ─── Find All ─────────────────────────────────────────────────────────────
  static async findAll({
    page = 1,
    limit = 20,
    userId,
    action,
    resourceType,
    startDate,
    endDate,
  } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from(this.TABLE)
      .select(`
        *,
        user:user_id(id, email, first_name, last_name, role)
      `, { count: 'exact' });

    if (userId) query = query.eq('user_id', userId);
    if (action) query = query.eq('action', action);
    if (resourceType) query = query.eq('resource_type', resourceType);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { data, count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  // ─── Find By User ─────────────────────────────────────────────────────────
  static async findByUser(userId, { page = 1, limit = 20 } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabaseAdmin
      .from(this.TABLE)
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { data, count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  // ─── Get Security Events ──────────────────────────────────────────────────
  static async getSecurityEvents({ page = 1, limit = 20 } = {}) {
    const securityActions = ['login', 'logout', 'password_changed', 'face_verification'];
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabaseAdmin
      .from(this.TABLE)
      .select(`
        *,
        user:user_id(id, email, role)
      `, { count: 'exact' })
      .in('action', securityActions)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { data, count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  // ─── Helper: Log Action ───────────────────────────────────────────────────
  static async log(action, options = {}) {
    return this.create({
      action,
      user_id: options.userId || null,
      resource_type: options.resourceType || null,
      resource_id: options.resourceId || null,
      old_data: options.oldData || null,
      new_data: options.newData || null,
      ip_address: options.ipAddress || null,
      user_agent: options.userAgent || null,
      request_id: options.requestId || null,
      success: options.success !== undefined ? options.success : true,
      error_message: options.errorMessage || null,
      metadata: options.metadata || {},
    });
  }
}

module.exports = AuditLog;