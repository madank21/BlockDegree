// BACKEND/models/User.js
const { getSupabaseAdmin } = require("../database/supabase");
const bcrypt = require("bcryptjs");

const TABLE = "users";

// ─── Helper: map DB row to app user object ────────────────────────────────
const mapUserFromDB = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password_hash: row.password_hash,
    role: row.role,
    student_id: row.student_id,
    institution_name: row.institution_name,
    wallet_address: row.wallet_address,
    is_active: row.is_active,
    last_login: row.last_login,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

// ─── Model ──────────────────────────────────────────────────────────────────
const User = {
  // ── Create ──────────────────────────────────────────────────────────────
  async create(data) {
    const supabase = getSupabaseAdmin();

    // Hash the password if provided
    let passwordHash = data.password_hash;
    if (data.password) {
      const salt = await bcrypt.genSalt(12);
      passwordHash = await bcrypt.hash(data.password, salt);
    }

    const { data: user, error } = await supabase
      .from(TABLE)
      .insert({
        name: data.name,
        email: data.email,
        password_hash: passwordHash,
        role: data.role || "student",
        student_id: data.student_id || null,
        institution_name: data.institution_name || null,
        wallet_address: data.wallet_address || null,
        is_active: data.is_active !== undefined ? data.is_active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`User.create failed: ${error.message}`);
    }

    return mapUserFromDB(user);
  },

  // ── Find by email ──────────────────────────────────────────────────────
  async findByEmail(email, includeHash = false) {
    const supabase = getSupabaseAdmin();

    // Select only what we need; optionally include password_hash
    let select = "id, name, email, role, student_id, institution_name, wallet_address, is_active, last_login, created_at, updated_at";
    if (includeHash) {
      select += ", password_hash";
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select(select)
      .eq("email", email)
      .maybeSingle();

    if (error || !data) return null;

    return mapUserFromDB(data);
  },

  // ── Find by ID ──────────────────────────────────────────────────────────
  async findById(id) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select()
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return mapUserFromDB(data);
  },

  // ── Check if email exists ──────────────────────────────────────────────
  async emailExists(email) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (error) return false;
    return !!data;
  },

  // ── Compare password ────────────────────────────────────────────────────
  async comparePassword(plainPassword, hashedPassword) {
    if (!hashedPassword) return false;
    return await bcrypt.compare(plainPassword, hashedPassword);
  },

  // ── Update ──────────────────────────────────────────────────────────────
  async update(id, updates) {
    const supabase = getSupabaseAdmin();

    // Allowed fields for update
    const allowed = [
      "name",
      "email",
      "password_hash",
      "role",
      "student_id",
      "institution_name",
      "wallet_address",
      "is_active",
      "last_login",
      "password_reset_token",
      "password_reset_expires",
      "email_verified",
      "email_verification_token",
    ];

    const payload = {
      updated_at: new Date().toISOString(),
    };

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        payload[key] = updates[key];
      }
    }

    // If we're updating password, hash it first
    if (updates.password) {
      const salt = await bcrypt.genSalt(12);
      payload.password_hash = await bcrypt.hash(updates.password, salt);
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`User.update failed: ${error.message}`);
    }

    return mapUserFromDB(data);
  },
};

module.exports = User;