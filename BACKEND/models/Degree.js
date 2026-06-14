const { supabaseAdmin } = require('../database/supabase');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class Degree {
  static TABLE = 'degrees';

  // ─── Generate Degree Hash ─────────────────────────────────────────────────
  static generateHash(degreeData) {
    const content = JSON.stringify({
      studentName: degreeData.student_name,
      studentId: degreeData.student_id,
      degreeTitle: degreeData.degree_title,
      fieldOfStudy: degreeData.field_of_study,
      graduationDate: degreeData.graduation_date,
      institutionId: degreeData.issuing_institution_id,
      certificateNumber: degreeData.certificate_number,
    });
    return '0x' + crypto.createHash('sha256').update(content).digest('hex');
  }

  // ─── Generate Certificate Number ──────────────────────────────────────────
  static generateCertificateNumber() {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BD-${year}-${random}`;
  }

  // ─── Create ───────────────────────────────────────────────────────────────
  static async create(degreeData) {
    const certificate_number = this.generateCertificateNumber();
    const degree_hash = this.generateHash({ ...degreeData, certificate_number });

    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .insert([{ ...degreeData, certificate_number, degree_hash }])
      .select(`
        *,
        graduate:graduate_id(id, email, first_name, last_name),
        institution:issuing_institution_id(id, institution_name, email)
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
        graduate:graduate_id(id, email, first_name, last_name, phone),
        institution:issuing_institution_id(id, institution_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  // ─── Find By Hash ─────────────────────────────────────────────────────────
  static async findByHash(hash) {
    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .select(`
        *,
        graduate:graduate_id(id, email, first_name, last_name),
        institution:issuing_institution_id(id, institution_name, email)
      `)
      .eq('degree_hash', hash)
      .single();

    if (error) return null;
    return data;
  }

  // ─── Find By Certificate Number ───────────────────────────────────────────
  static async findByCertificateNumber(certNumber) {
    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .select(`
        *,
        graduate:graduate_id(id, email, first_name, last_name),
        institution:issuing_institution_id(id, institution_name, email)
      `)
      .eq('certificate_number', certNumber)
      .single();

    if (error) return null;
    return data;
  }

  // ─── Find By Graduate ─────────────────────────────────────────────────────
  static async findByGraduate(graduateId, { page = 1, limit = 10 } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabaseAdmin
      .from(this.TABLE)
      .select(`
        *,
        institution:issuing_institution_id(id, institution_name)
      `, { count: 'exact' })
      .eq('graduate_id', graduateId)
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { data, count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  // ─── Find By Institution ──────────────────────────────────────────────────
  static async findByInstitution(institutionId, { page = 1, limit = 10, status, search } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from(this.TABLE)
      .select(`
        *,
        graduate:graduate_id(id, email, first_name, last_name)
      `, { count: 'exact' })
      .eq('issuing_institution_id', institutionId);

    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(`student_name.ilike.%${search}%,student_id.ilike.%${search}%,certificate_number.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { data, count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  // ─── Find All ─────────────────────────────────────────────────────────────
  static async findAll({ page = 1, limit = 10, status, search } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from(this.TABLE)
      .select(`
        *,
        graduate:graduate_id(id, email, first_name, last_name),
        institution:issuing_institution_id(id, institution_name)
      `, { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(`student_name.ilike.%${search}%,degree_title.ilike.%${search}%,certificate_number.ilike.%${search}%`);
    }

    const { data, error, count } = await query
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

  // ─── Revoke ───────────────────────────────────────────────────────────────
  static async revoke(id, revokedBy, reason) {
    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .update({
        is_revoked: true,
        revocation_reason: reason,
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy,
        status: 'rejected',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  // ─── Get Statistics ───────────────────────────────────────────────────────
  static async getStats(institutionId = null) {
    let query = supabaseAdmin
      .from(this.TABLE)
      .select('status, is_revoked, created_at');

    if (institutionId) query = query.eq('issuing_institution_id', institutionId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const currentYear = new Date().getFullYear();

    return {
      total: data.length,
      byStatus: {
        pending: data.filter(d => d.status === 'pending').length,
        verified: data.filter(d => d.status === 'verified').length,
        rejected: data.filter(d => d.status === 'rejected').length,
        flagged: data.filter(d => d.status === 'flagged').length,
      },
      revoked: data.filter(d => d.is_revoked).length,
      thisYear: data.filter(d => new Date(d.created_at).getFullYear() === currentYear).length,
    };
  }
}

module.exports = Degree;