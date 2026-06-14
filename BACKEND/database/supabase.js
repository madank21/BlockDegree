const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const { logger } = require('../src/utils/logger');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Public client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    transport: ws,   // 🔥 FIX HERE
  },
  auth: {
    autoRefreshToken: true,
    persistSession: false,
  },
});

// Admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  realtime: {
    transport: ws,   // 🔥 FIX HERE
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});