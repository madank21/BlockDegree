// /models/User.js
// ─────────────────────────────────────────────────────────────
// User Model — Supabase Query Wrapper
// ─────────────────────────────────────────────────────────────

const { getSupabaseAdmin } = require("../database/supabase");

const TABLE = "users";

// ─────────────────────────────────────────────────────────────
// DB → APP MAPPER
// ─────────────────────────────────────────────────────────────
const mapUserFromDB = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,

    studentId: row.student_id,
    institutionId: row.institution_id,
    institutionName: row.institution_name,

    walletAddress: row.wallet_address,

    faceDescriptor: row.face_descriptor,
    faceDescriptorHash: row.face_descriptor_hash,
    faceRegisteredAt: row.face_registered_at,

    isActive: row.is_active,
    emailVerified: row.email_verified,
    avatarUrl: row.avatar_url,
    lastLogin: row.last_login,
    metadata: row.metadata,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const mapMany = (rows) => (rows || []).map(mapUserFromDB);

const DEFAULT_COLUMNS = `
  id, name, email, password_hash, role,
  student_id, institution_id, institution_name,
  wallet_address,
  face_descriptor, face_descriptor_hash, face_registered_at,
  is_active, email_verified, avatar_url, last_login, metadata,
  created_at, updated_at
`;

// ─────────────────────────────────────────────────────────────
// MODEL
// ─────────────────────────────────────────────────────────────
const User = {

  // ── Create ────────────────────────────────────────────────
  async create(data) {
    const supabase = getSupabaseAdmin();

    const { data: user, error } = await supabase
      .from(TABLE)
      .insert({
        name: data.name,
        email: data.email,
        password_hash: data.passwordHash || data.password_hash,
        role: data.role || "student",

        student_id: data.studentId || data.student_id || null,
        institution_id: data.institutionId || data.institution_id || null,
        institution_name: data.institutionName || data.institution_name || null,

        wallet_address: data.walletAddress || data.wallet_address || null,

        face_descriptor: data.faceDescriptor || data.face_descriptor || null,
        face_descriptor_hash: data.faceDescriptorHash || data.face_descriptor_hash || null,
        face_registered_at: data.faceRegisteredAt || data.face_registered_at || null,

        is_active: data.isActive !== undefined ? data.isActive : true,
        email_verified: data.emailVerified || false,
        avatar_url: data.avatarUrl || data.avatar_url || null,
        last_login: data.lastLogin || data.last_login || null,
        metadata: data.metadata || {},

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(DEFAULT_COLUMNS)
      .single();

    if (error) throw new Error(`User.create failed: ${error.message}`);

    return mapUserFromDB(user);
  },

  // ── Find by ID ────────────────────────────────────────────
  async findById(id) {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from(TABLE)
      .select(DEFAULT_COLUMNS)
      .eq("id", id)
      .single();

    if (error || !data) return null;

    return mapUserFromDB(data);
  },

  // ── Find by email ─────────────────────────────────────────
  async findByEmail(email) {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from(TABLE)
      .select(DEFAULT_COLUMNS)
      .eq("email", email)
      .maybeSingle();

    if (error || !data) return null;

    return mapUserFromDB(data);
  },

  // ── Find many (with filters) ─────────────────────────────
  async findMany({ 
    page = 1, 
    limit = 10, 
    role, 
    isActive, 
    search,
    institutionId,
  } = {}) {
    const supabase = getSupabaseAdmin();
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from(TABLE)
      .select(DEFAULT_COLUMNS, { count: "exact" });

    if (role) query = query.eq("role", role);
    if (isActive !== undefined) query = query.eq("is_active", isActive);
    if (institutionId) query = query.eq("institution_id", institutionId);

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,` +
        `email.ilike.%${search}%,` +
        `student_id.ilike.%${search}%`
      );
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw new Error(`User.findMany failed: ${error.message}`);

    return {
      data: mapMany(data),
      total: count || 0,
    };
  },

  // ── Update ────────────────────────────────────────────────
  async update(id, updates) {
    const supabase = getSupabaseAdmin();

    const payload = {
      updated_at: new Date().toISOString(),
    };

    const map = {
      name: "name",
      email: "email",
      passwordHash: "password_hash",
      role: "role",
      studentId: "student_id",
      institutionId: "institution_id",
      institutionName: "institution_name",
      walletAddress: "wallet_address",
      faceDescriptor: "face_descriptor",
      faceDescriptorHash: "face_descriptor_hash",
      faceRegisteredAt: "face_registered_at",
      isActive: "is_active",
      emailVerified: "email_verified",
      avatarUrl: "avatar_url",
      lastLogin: "last_login",
      metadata: "metadata",
    };

    for (const [key, col] of Object.entries(map)) {
      if (updates[key] !== undefined) {
        payload[col] = updates[key];
      }
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq("id", id)
      .select(DEFAULT_COLUMNS)
      .single();

    if (error) throw new Error(`User.update failed: ${error.message}`);

    return mapUserFromDB(data);
  },

  // ── Delete (soft or hard) ────────────────────────────────
  async delete(id, hard = false) {
    const supabase = getSupabaseAdmin();

    if (hard) {
      const { error } = await supabase
        .from(TABLE)
        .delete()
        .eq("id", id);
      if (error) throw new Error(`User.delete failed: ${error.message}`);
      return true;
    } else {
      // soft delete: set is_active = false
      const { data, error } = await supabase
        .from(TABLE)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(DEFAULT_COLUMNS)
        .single();

      if (error) throw new Error(`User.softDelete failed: ${error.message}`);
      return mapUserFromDB(data);
    }
  },

  // ── Count ─────────────────────────────────────────────────
  async count(filters = {}) {
    const supabase = getSupabaseAdmin();
    let query = supabase.from(TABLE).select("*", { count: "exact", head: true });

    if (filters.role) query = query.eq("role", filters.role);
    if (filters.isActive !== undefined) query = query.eq("is_active", filters.isActive);

    const { count, error } = await query;
    if (error) throw new Error(`User.count failed: ${error.message}`);
    return count || 0;
  },

  // ── NEW: Check if email exists ────────────────────────────
  // Returns true if a user with the given email exists, false otherwise.
  async emailExists(email) {
    if (!email) return false;
    const user = await this.findByEmail(email);
    return !!user;
  },
  // ──────────────────────────────────────────────────────────
};

module.exports = User;