// /database/supabase.js
// ─────────────────────────────────────────────────────────────────────────────
// Supabase Client — Single Source of Truth for All Database Operations
// ─────────────────────────────────────────────────────────────────────────────
// Two clients:
//   supabaseAnon  → respects Row Level Security (RLS) — public operations
//   supabaseAdmin → bypasses RLS — all server-side controller operations
//
// NEVER expose supabaseAdmin or SUPABASE_SERVICE_KEY to the frontend.
// ─────────────────────────────────────────────────────────────────────────────

const { createClient } = require("@supabase/supabase-js");
const { logger } = require("../src/utils/logger");

// ── Environment validation ────────────────────────────────────────────────────
if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL is required in .env");
}
if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_ANON_KEY is required in .env");
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("SUPABASE_SERVICE_KEY is required in .env");
}

// ── Anonymous client ──────────────────────────────────────────────────────────
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  }
);

// ── Service-role client (bypasses RLS) ───────────────────────────────────────
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  }
);

// ── Health check ──────────────────────────────────────────────────────────────
const checkSupabaseConnection = async () => {
  try {
    const { error } = await supabaseAdmin
      .from("users")
      .select("id")
      .limit(1);

    if (error) throw error;
    logger.info("[Supabase] Connection verified successfully");
    return true;
  } catch (err) {
    logger.error(`[Supabase] Connection check failed: ${err.message}`);
    return false;
  }
};

const getSupabaseAnon  = () => supabaseAnon;
const getSupabaseAdmin = () => supabaseAdmin;

logger.info("[Supabase] Clients initialised");

module.exports = {
  getSupabaseAnon,
  getSupabaseAdmin,
  checkSupabaseConnection,
};