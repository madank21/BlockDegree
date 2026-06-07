-- ============================================
-- SUPABASE DATABASE SCHEMA
-- Run these SQL queries in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  registration_number TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'student',
  verification_status TEXT NOT NULL DEFAULT 'pending',
  father_name TEXT,
  cnic_number TEXT UNIQUE,
  department TEXT,
  program TEXT,
  admission_year INTEGER,
  graduation_year INTEGER,
  cgpa DECIMAL(3,2),
  profile_photo TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DEGREE APPLICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS degree_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  department TEXT NOT NULL,
  program TEXT NOT NULL,
  degree_title TEXT NOT NULL,
  cgpa DECIMAL(3,2),
  admission_year INTEGER,
  graduation_year INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  blockchain_hash TEXT,
  degree_id TEXT UNIQUE,
  qr_code_data TEXT,
  fraud_score INTEGER DEFAULT 80,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  ocr_status TEXT DEFAULT 'pending',
  yolo_status TEXT DEFAULT 'pending',
  extracted_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BLOCKCHAIN TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash TEXT NOT NULL UNIQUE,
  degree_id TEXT NOT NULL,
  student_reg_no TEXT NOT NULL,
  degree_hash TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  issuer_address TEXT NOT NULL,
  block_number INTEGER,
  gas_used INTEGER,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  details TEXT,
  category TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FRAUD REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS fraud_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  fraud_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VERIFICATION REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  degree_id TEXT NOT NULL UNIQUE,
  verifier_email TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  result TEXT,
  blockchain_verified BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_registration_number ON users(registration_number);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_degree_applications_student_id ON degree_applications(student_id);
CREATE INDEX idx_degree_applications_status ON degree_applications(status);
CREATE INDEX idx_degree_applications_degree_id ON degree_applications(degree_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);
CREATE INDEX idx_blockchain_tx_hash ON blockchain_transactions(tx_hash);
CREATE INDEX idx_blockchain_degree_id ON blockchain_transactions(degree_id);
CREATE INDEX idx_fraud_reports_student_id ON fraud_reports(student_id);
CREATE INDEX idx_fraud_reports_resolved ON fraud_reports(resolved);
CREATE INDEX idx_verification_requests_degree_id ON verification_requests(degree_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE degree_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- Users: Students can only read their own data, admins can read all
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (
    auth.uid()::text = id::text OR
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Degree Applications: Students can read own, admins can read all
CREATE POLICY "Students can read own degrees" ON degree_applications
  FOR SELECT USING (
    student_id::text = auth.uid()::text OR
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

-- Documents: Students can read own, admins can read all
CREATE POLICY "Students can read own documents" ON documents
  FOR SELECT USING (
    user_id::text = auth.uid()::text OR
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

-- Audit Logs: Admins can read
CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage bucket for documents (run in Supabase dashboard)
-- CREATE STORAGE BUCKET IF NOT EXISTS documents;

-- Set bucket to public
-- UPDATE storage.buckets SET public = true WHERE name = 'documents';

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- Verification Status Summary
CREATE VIEW verification_summary AS
SELECT 
  verification_status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM users
WHERE role = 'student'
GROUP BY verification_status;

-- Degree Status Summary
CREATE VIEW degree_status_summary AS
SELECT 
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM degree_applications
GROUP BY status;

-- Recent Audit Activity
CREATE VIEW recent_audit_activity AS
SELECT 
  action,
  COUNT(*) as count,
  MAX(timestamp) as last_occurrence
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY last_occurrence DESC;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger on users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger on degree_applications table
CREATE TRIGGER update_degree_applications_updated_at BEFORE UPDATE ON degree_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger on documents table
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- INSERT INTO users (name, email, registration_number, role, verification_status, father_name, cnic_number, department, program, admission_year, graduation_year, cgpa, password_hash)
-- VALUES
--   ('Madan Kumar', 'madan.70618@iqra.edu.pk', '70618', 'student', 'approved', 'Raj Kumar', '42201-1234567-1', 'Computer Science', 'BS Computer Science', 2022, 2026, 3.74, 'hashed_password'),
--   ('Dr. Abdullah Shah', 'admin@iqra.edu.pk', 'ADM001', 'admin', 'approved', NULL, NULL, 'Administration', NULL, 2020, 2025, NULL, 'hashed_password');
