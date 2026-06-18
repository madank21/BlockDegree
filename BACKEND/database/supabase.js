const { createClient } = require("@supabase/supabase-js");
const { logger } = require("../src/utils/logger");

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY    = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL)         throw new Error("SUPABASE_URL must be set in .env");
if (!SUPABASE_ANON_KEY)    throw new Error("SUPABASE_ANON_KEY must be set in .env");
if (!SUPABASE_SERVICE_KEY) throw new Error("SUPABASE_SERVICE_KEY must be set in .env");

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const getSupabaseAnon  = () => supabaseAnon;
const getSupabaseAdmin = () => supabaseAdmin;

const checkSupabaseConnection = async () => {
  try {
    const { error } = await supabaseAdmin.from("users").select("id").limit(1);
    if (error) throw error;
    logger.info("[Supabase] Connection verified");
    return true;
  } catch (err) {
    logger.error(`[Supabase] Connection check failed: ${err.message}`);
    return false;
  }
};

logger.info("[Supabase] Clients initialised");
module.exports = { getSupabaseAnon, getSupabaseAdmin, checkSupabaseConnection };