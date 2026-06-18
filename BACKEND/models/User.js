// /models/User.js
// ─────────────────────────────────────────────────────────────────────────────
// User Model — Supabase Query Wrapper
// No Mongoose. No MongoDB. Pure Supabase PostgreSQL.
// ─────────────────────────────────────────────────────────────────────────────

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { getSupabaseAdmin } = require("../database/supabase");

const TABLE = "users";

// Columns returned by default — face_descriptor intentionally excluded
const PUBLIC_COLUMNS =
  "id, name, email, role, student_id, institution_id, institution_name, " +
  "wallet_address, is_active, email_verified, avatar_url, " +
  "face_registered_at, last_login, metadata, created_at, updated_at";

const User = {

  // ── Create ────────────────────────────────────────────────────────────────
  async create(data) {
    const supabase     = getSupabaseAdmin();
    const passwordHash = await bcrypt.hash(
      data.password || data.passwordHash,
      12
    );

    const { data: user, error } = await supabase
      .from(TABLE)
      .insert({
        name:             data.name,
        email:            data.email.toLowerCase().trim(),
        password_hash:    passwordHash,
        role:             data.role             || "student",
        student_id:       data.studentId        || data.student_id        || null,
        institution_id:   data.institutionId    || data.institution_id    || null,
        institution_name: data.institutionName  || data.institution_name  || null,
        wallet_address:   data.walletAddress    || data.wallet_address    || null,
        is_active:        true,
        email_verified:   false,
        metadata:         data.metadata         || {},
        created_at:       new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      })
      .select(PUBLIC_COLUMNS)
      .single();

    if (error) throw new Error(`User.create failed: ${error.message}`);
    return user;
  },

  // ── Find by ID ────────────────────────────────────────────────────────────
  async findById(id) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select(PUBLIC_COLUMNS)
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  },

  // ── Find by email (without password by default) ───────────────────────────
  async findByEmail(email, includePassword = false) {
    const supabase = getSupabaseAdmin();
    const columns  = includePassword
      ? PUBLIC_COLUMNS + ", password_hash"
      : PUBLIC_COLUMNS;

    const { data, error } = await supabase
      .from(TABLE)
      .select(columns)
      .eq("email", email.toLowerCase().trim())
      .single();

    if (error) return null;
    return data;
  },

  // ── Find by student ID ────────────────────────────────────────────────────
  async findByStudentId(studentId) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, name, email, role, student_id, institution_id, is_active")
      .eq("student_id", studentId)
      .single();

    if (error) return null;
    return data;
  },

  // ── Update ────────────────────────────────────────────────────────────────
  async update(id, updates) {
    const supabase = getSupabaseAdmin();
    const payload  = { updated_at: new Date().toISOString() };

    // Explicit field mapping — camelCase or snake_case both accepted
    if (updates.name             !== undefined) payload.name             = updates.name;
    if (updates.isActive         !== undefined) payload.is_active        = updates.isActive;
    if (updates.is_active        !== undefined) payload.is_active        = updates.is_active;
    if (updates.lastLogin        !== undefined) payload.last_login       = updates.lastLogin;
    if (updates.last_login       !== undefined) payload.last_login       = updates.last_login;
    if (updates.avatarUrl        !== undefined) payload.avatar_url       = updates.avatarUrl;
    if (updates.walletAddress    !== undefined) payload.wallet_address   = updates.walletAddress;
    if (updates.emailVerified    !== undefined) payload.email_verified   = updates.emailVerified;
    if (updates.metadata         !== undefined) payload.metadata         = updates.metadata;

    // Face descriptor update
    if (updates.faceDescriptor) {
      payload.face_descriptor      = JSON.stringify(updates.faceDescriptor);
      payload.face_descriptor_hash = crypto
        .createHash("sha256")
        .update(JSON.stringify(updates.faceDescriptor))
        .digest("hex");
      payload.face_registered_at   = new Date().toISOString();
    }

    // Face descriptor deletion (GDPR)
    if (updates.deleteFace === true) {
      payload.face_descriptor      = null;
      payload.face_descriptor_hash = null;
      payload.face_registered_at   = null;
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq("id", id)
      .select(PUBLIC_COLUMNS)
      .single();

    if (error) throw new Error(`User.update failed: ${error.message}`);
    return data;
  },

  // ── Compare password ──────────────────────────────────────────────────────
  async comparePassword(candidatePassword, passwordHash) {
    return bcrypt.compare(candidatePassword, passwordHash);
  },

  // ── Email exists check ────────────────────────────────────────────────────
  async emailExists(email) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from(TABLE)
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();
    return !!data;
  },

  // ── Get face descriptor (sensitive — explicit select only) ────────────────
  async getFaceDescriptor(userId) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("face_descriptor, face_descriptor_hash, face_registered_at")
      .eq("id", userId)
      .single();

    if (error || !data?.face_descriptor) return null;

    return {
      descriptor:     JSON.parse(data.face_descriptor),
      descriptorHash: data.face_descriptor_hash,
      registeredAt:   data.face_registered_at,
    };
  },

  // ── Count users by role ───────────────────────────────────────────────────
  async countByRole(role) {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("role", role)
      .eq("is_active", true);

    if (error) return 0;
    return count || 0;
  },

  // ── Count users with face registered ─────────────────────────────────────
  async countWithFace() {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .not("face_descriptor", "is", null);

    if (error) return 0;
    return count || 0;
  },

  // ── Total active users ────────────────────────────────────────────────────
  async countTotal() {
    const supabase = getSupabaseAdmin();
    const { count, error } = await supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    if (error) return 0;
    return count || 0;
  },
};

module.exports = User;