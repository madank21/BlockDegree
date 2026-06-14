const { supabaseAdmin } = require('../database/supabase');
const bcrypt = require('bcryptjs');

class User {
  static TABLE = 'users';

  // ─── Create ───────────────────────────────────────────────────────────────
  static async create(userData) {
    const { password, ...rest } = userData;
    const password_hash = await bcrypt.hash(password, 12);

    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .insert([{ ...rest, password_hash }])
      .select('id, email, role, first_name, last_name, is_active, created_at')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // ─── Find By ID ───────────────────────────────────────────────────────────
  static async findById(id, includePassword = false) {
    const selectFields = includePassword
      ? '*'
      : 'id, email, role, first_name, last_name, phone, avatar_url, institution_name, institution_id, is_active, is_email_verified, last_login, two_factor_enabled, face_encoding, metadata, created_at, updated_at';

    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .select(selectFields)
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  // ─── Find By Email ────────────────────────────────────────────────────────
  static async findByEmail(email, includePassword = false) {
    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error) return null;

    if (!includePassword && data) {
      const { password_hash, ...user } = data;
      return user;
    }

    return data;
  }

  // ─── Update ───────────────────────────────────────────────────────────────
  static async update(id, updateData) {
    if (updateData.password) {
      updateData.password_hash = await bcrypt.hash(updateData.password, 12);
      delete updateData.password;
    }

    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .update(updateData)
      .eq('id', id)
      .select('id, email, role, first_name, last_name, phone, avatar_url, institution_name, is_active, updated_at')
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  static async delete(id) {
    const { error } = await supabaseAdmin
      .from(this.TABLE)
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return true;
  }

  // ─── Find All ─────────────────────────────────────────────────────────────
  static async findAll({ page = 1, limit = 10, role, isActive, search } = {}) {
    let query = supabaseAdmin
      .from(this.TABLE)
      .select('id, email, role, first_name, last_name, institution_name, is_active, last_login, created_at', { count: 'exact' });

    if (role) query = query.eq('role', role);
    if (typeof isActive === 'boolean') query = query.eq('is_active', isActive);
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { data, count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  // ─── Compare Password ─────────────────────────────────────────────────────
  static async comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // ─── Verify Email ─────────────────────────────────────────────────────────
  static async verifyEmail(token) {
    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .select('*')
      .eq('email_verification_token', token)
      .gt('email_verification_expires', new Date().toISOString())
      .single();

    if (error || !data) return null;

    const { data: updated } = await supabaseAdmin
      .from(this.TABLE)
      .update({
        is_email_verified: true,
        email_verification_token: null,
        email_verification_expires: null,
      })
      .eq('id', data.id)
      .select()
      .single();

    return updated;
  }

  // ─── Reset Password ───────────────────────────────────────────────────────
  static async resetPassword(token, newPassword) {
    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .select('*')
      .eq('password_reset_token', token)
      .gt('password_reset_expires', new Date().toISOString())
      .single();

    if (error || !data) return null;

    const password_hash = await bcrypt.hash(newPassword, 12);

    const { data: updated } = await supabaseAdmin
      .from(this.TABLE)
      .update({
        password_hash,
        password_reset_token: null,
        password_reset_expires: null,
        failed_login_attempts: 0,
      })
      .eq('id', data.id)
      .select('id, email, role')
      .single();

    return updated;
  }

  // ─── Update Login Attempts ────────────────────────────────────────────────
  static async updateLoginAttempts(id, attempts, lockedUntil = null) {
    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .update({
        failed_login_attempts: attempts,
        locked_until: lockedUntil,
      })
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // ─── Update Last Login ────────────────────────────────────────────────────
  static async updateLastLogin(id) {
    await supabaseAdmin
      .from(this.TABLE)
      .update({
        last_login: new Date().toISOString(),
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq('id', id);
  }

  // ─── Get Statistics ───────────────────────────────────────────────────────
  static async getStats() {
    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .select('role, is_active');

    if (error) throw new Error(error.message);

    const stats = {
      total: data.length,
      byRole: {},
      active: data.filter(u => u.is_active).length,
      inactive: data.filter(u => !u.is_active).length,
    };

    data.forEach(user => {
      stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
    });

    return stats;
  }
}

module.exports = User;