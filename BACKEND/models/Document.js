const { supabaseAdmin } = require('../database/supabase');
const crypto = require('crypto');
const fs = require('fs');

class Document {
  static TABLE = 'documents';

  // ─── Generate File Hash ───────────────────────────────────────────────────
  static generateFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    return '0x' + crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  // ─── Create ───────────────────────────────────────────────────────────────
  static async create(documentData) {
    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .insert([documentData])
      .select()
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
        user:user_id(id, email, first_name, last_name),
        degree:degree_id(id, degree_title, certificate_number)
      `)
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  // ─── Find By User ─────────────────────────────────────────────────────────
  static async findByUser(userId, { page = 1, limit = 10, documentType } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from(this.TABLE)
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (documentType) query = query.eq('document_type', documentType);

    const { data, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { data, count, page, limit, totalPages: Math.ceil(count / limit) };
  }

  // ─── Find By Degree ───────────────────────────────────────────────────────
  static async findByDegree(degreeId) {
    const { data, error } = await supabaseAdmin
      .from(this.TABLE)
      .select('*')
      .eq('degree_id', degreeId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
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

  // ─── Delete ───────────────────────────────────────────────────────────────
  static async delete(id) {
    const { error } = await supabaseAdmin
      .from(this.TABLE)
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return true;
  }

  // ─── Check Duplicate Hash ─────────────────────────────────────────────────
  static async findByHash(hash) {
    const { data } = await supabaseAdmin
      .from(this.TABLE)
      .select('id, file_name, user_id')
      .eq('file_hash', hash)
      .single();

    return data;
  }

  // ─── Find All (Admin) ─────────────────────────────────────────────────────
  static async findAll({ page = 1, limit = 10, isVerified, fraudScoreMin } = {}) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from(this.TABLE)
      .select(`
        *,
        user:user_id(id, email, first_name, last_name)
      `, { count: 'exact' });

    if (typeof isVerified === 'boolean') query = query.eq('is_verified', isVerified);
    if (fraudScoreMin) query = query.gte('fraud_score', fraudScoreMin);

    const { data, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { data, count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

module.exports = Document;