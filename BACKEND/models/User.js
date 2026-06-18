// /models/User.js
// ─────────────────────────────────────────────────────────────────────────────
// User Model — Supabase Query Wrapper
// Provides a clean interface matching the original MongoDB-style calls
// but executing against Supabase PostgreSQL
// ─────────────────────────────────────────────────────────────────────────────

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { getSupabaseAdmin } = require("../database/supabase");

const TABLE = "users";

const User = {

  // ── Create a new user ─────────────────────────────────────────────────────
  async create(data) {
    const supabase = getSupabaseAdmin();

    const passwordHash = await bcrypt.hash(data.password || data.passwordHash, 12);

    const { data: user, error } = await supabase
      .from(TABLE)
      .insert({
        name:             data.name,
        email:            data.email.toLowerCase().trim(),
        password_hash:    passwordHash,
        role:             data.role || "student",
        student_id:       data.studentId        || data.student_id   || null,
        institution_id:   data.institutionId    || data.institution_id || null,
        institution_name: data.institutionName  || data.institution_name || null,
        wallet_address:   data.walletAddress    || data.wallet_address || null,
        is_active:        true,
        email_verified:   false,
        created_at:       new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      })
      .select("id, name, email, role, student_id, institution_id, institution_name, is_active, created_at")
      .single();

    if (error) throw new Error(`User.create failed: ${error.message}`);
    return user;
  },

  // ── Find by ID ────────────────────────────────────────────────────────────
  async findById(id, includePassword = false, includeFace = false) {
    const supabase = getSupabaseAdmin();

    let columns = "id, name, email, role, student_id, institution_id, institution_name, wallet_address, is_active, email_verified, avatar_url, last_login, face_registered_at, created_at, updated_at";
    if (includePassword) columns += ", password_hash";
    if (includeFace)     columns += ", face_descriptor, face_descriptor_hash";

    const { data, error } = await supabase
      .from(TABLE)
      .select(columns)
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  },

  // ── Find by email (with password for login) ───────────────────────────────
  async findByEmail(email, includePassword = false) {
    const supabase = getSupabaseAdmin();

    let columns = "id, name, email, role, student_id, institution_id, institution_name, wallet_address, is_active, email_verified, face_registered_at, created_at";
    if (includePassword) columns += ", password_hash";

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

  // ── Update user ───────────────────────────────────────────────────────────
  async update(id, updates) {
    const supabase = getSupabaseAdmin();

    // Map camelCase to snake_case
    const mapped = {};
    if (updates.name)            mapped.name             = updates.name;
    if (updates.email)           mapped.email            = updates.email.toLowerCase();
    if (updates.isActive  !== undefined) mapped.is_active = updates.isActive;
    if (updates.lastLogin)       mapped.last_login       = updates.lastLogin;
    if (updates.avatarUrl)       mapped.avatar_url       = updates.avatarUrl;
    if (updates.walletAddress)   mapped.wallet_address   = updates.walletAddress;
    if (updates.emailVerified !== undefined) mapped.email_verified = updates.emailVerified;

    // Face descriptor updates
    if (updates.faceDescriptor) {
      mapped.face_descriptor      = JSON.stringify(updates.faceDescriptor);
      mapped.face_descriptor_hash = crypto
        .createHash("sha256")
        .update(JSON.stringify(updates.faceDescriptor))
        .digest("hex");
      mapped.face_registered_at   = new Date().toISOString();
    }

    if (updates.deleteFace) {
      mapped.face_descriptor      = null;
      mapped.face_descriptor_hash = null;
      mapped.face_registered_at   = null;
    }

    mapped.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from(TABLE)
      .update(mapped)
      .eq("id", id)
      .select("id, name, email, role, is_active, updated_at")
      .single();

    if (error) throw new Error(`User.update failed: ${error.message}`);
    return data;
  },

  // ── Compare password ──────────────────────────────────────────────────────
  async comparePassword(candidatePassword, passwordHash) {
    return bcrypt.compare(candidatePassword, passwordHash);
  },

  // ── Check email exists ────────────────────────────────────────────────────
  async emailExists(email) {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from(TABLE)
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    return !!data;
  },

  // ── Get face descriptor (sensitive field — explicit select) ───────────────
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
};

module.exports = User;