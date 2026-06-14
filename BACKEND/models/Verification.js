const { supabaseAdmin } = require('../database/supabase');
const crypto = require('crypto');

class Verification {
  static TABLE = 'verifications';

  // ─── Generate Verification Code ───────────────────────────────────────────
  static generateCode() {
    return 'VRF-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  }

  // ─── Create ───────────────────────────────────────────────────────────────
  static async create(verificationData) {
    const verification_code = this.generateCode();
    const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .insert([{ ...verificationData, verification_code, expires_at }])
      .select(`
        *,
        degree:degree_id(
          id, degree_title, student_name, certificate_number, graduation_date,
          institution:issuing_institution_id(institution_name)
        )
      `)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // ─── Find By ID ───────────────────────────────────────────────────────────
  static async findById(id) {
    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .select(`
        *,
        degree:degree_id(
          *,
          graduate:graduate_id(id, email, first_name, last_name),
          institution:issuing_institution_id(id, institution_name, email)
        ),
        requester:requested_by(id, email, first_name, last_name, institution_name)
      `)
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  // ─── Find By Code ─────────────────────────────────────────────────────────
  static async findByCode(code) {
    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .select(`
        *,
        degree:degree_id(
          *,
          graduate:graduate_id(id, email, first_name, last_name),
          institution:issuing_institution_id(id, institution_name, email)
        )
      `)
      .eq('verification_code', code)
      .single();

    if (error) return null;
    return data;
  }

  // ─── Find By Degree ───────────────────────────────────────────────────────
  static async findByDegree(degreeId, { page = 1, limit = 10 } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabaseAdmin
      .from(this.TABLE)
      .select('*', { count: 'exact' })
      .eq('degree_id', degreeId)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { data, count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  // ─── Update ───────────────────────────────────────────────────────────────
  static async update(id, updateData) {
    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // ─── Find All ─────────────────────────────────────────────────────────────
  static async findAll({ page = 1, limit = 10, status, requestedBy } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from(this.TABLE)
      .select(`
        *,
        degree:degree_id(id, degree_title, student_name, certificate_number),
        requester:requested_by(id, email, institution_name)
      `, { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (requestedBy) query = query.eq('requested_by', requestedBy);

    const { data, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { data, count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  // ─── Get Stats ────────────────────────────────────────────────────────────
  static async getStats(userId = null) {
    let query = supabaseAdmin
      .from(this.TABLE)
      .select('status, blockchain_verified, face_verified, fraud_check_passed, created_at');

    if (userId) query = query.eq('requested_by', userId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return {
      total: data.length,
      byStatus: {
        pending: data.filter(v => v.status === 'pending').length,
        verified: data.filter(v => v.status === 'verified').length,
        rejected: data.filter(v => v.status === 'rejected').length,
        flagged: data.filter(v => v.status === 'flagged').length,
      },
      blockchainVerified: data.filter(v => v.blockchain_verified).length,
      faceVerified: data.filter(v => v.face_verified).length,
    };
  }
}

module.exports = Verification;