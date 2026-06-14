const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../src/utils/logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Public client (respects RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
  },
  global: {
    headers: {
      'x-application-name': 'blockdegree-backend',
    },
  },
});

// Admin client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test connection
const testConnection = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      logger.warn('Supabase connection test warning:', error.message);
    } else {
      logger.info('✅ Supabase connected successfully');
    }
  } catch (err) {
    logger.error('❌ Supabase connection failed:', err.message);
  }
};

testConnection();

module.exports = { supabase, supabaseAdmin };