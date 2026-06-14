-- ============================================================
-- BlockDegree Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'university', 'employer', 'graduate');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'flagged');
CREATE TYPE document_type AS ENUM ('degree', 'transcript', 'certificate', 'identity');
CREATE TYPE audit_action AS ENUM (
  'user_created', 'user_updated', 'user_deleted',
  'degree_issued', 'degree_revoked',
  'verification_requested', 'verification_completed',
  'document_uploaded', 'document_deleted',
  'blockchain_transaction', 'face_verification',
  'login', 'logout', 'password_changed'
);

-- ─── USERS ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'graduate',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  institution_name VARCHAR(255),
  institution_id VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  email_verification_expires TIMESTAMPTZ,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  refresh_token TEXT,
  last_login TIMESTAMPTZ,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret VARCHAR(255),
  face_encoding TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DEGREES ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS degrees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  degree_hash VARCHAR(66) UNIQUE NOT NULL,
  token_id VARCHAR(100),
  graduate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issuing_institution_id UUID NOT NULL REFERENCES users(id),
  student_name VARCHAR(255) NOT NULL,
  student_id VARCHAR(100) NOT NULL,
  degree_title VARCHAR(255) NOT NULL,
  field_of_study VARCHAR(255) NOT NULL,
  graduation_date DATE NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  gpa DECIMAL(3, 2),
  honors VARCHAR(100),
  certificate_number VARCHAR(100) UNIQUE NOT NULL,
  blockchain_tx_hash VARCHAR(66),
  blockchain_block_number BIGINT,
  blockchain_timestamp TIMESTAMPTZ,
  status verification_status DEFAULT 'pending',
  is_revoked BOOLEAN DEFAULT false,
  revocation_reason TEXT,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id),
  qr_code_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DOCUMENTS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  degree_id UUID REFERENCES degrees(id) ON DELETE SET NULL,
  document_type document_type NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_hash VARCHAR(66) NOT NULL,
  ocr_data JSONB DEFAULT '{}',
  ocr_confidence DECIMAL(5, 2),
  fraud_score DECIMAL(5, 2),
  is_verified BOOLEAN DEFAULT false,
  verification_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── VERIFICATIONS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verification_code VARCHAR(20) UNIQUE NOT NULL,
  degree_id UUID NOT NULL REFERENCES degrees(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id),
  requester_email VARCHAR(255),
  requester_organization VARCHAR(255),
  purpose TEXT,
  status verification_status DEFAULT 'pending',
  blockchain_verified BOOLEAN DEFAULT false,
  face_verified BOOLEAN DEFAULT false,
  document_verified BOOLEAN DEFAULT false,
  fraud_check_passed BOOLEAN DEFAULT false,
  fraud_score DECIMAL(5, 2),
  verification_result JSONB DEFAULT '{}',
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(100),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BLOCKCHAIN TRANSACTIONS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_hash VARCHAR(66) UNIQUE NOT NULL,
  block_number BIGINT,
  from_address VARCHAR(42) NOT NULL,
  to_address VARCHAR(42),
  contract_address VARCHAR(42),
  function_name VARCHAR(100),
  degree_id UUID REFERENCES degrees(id),
  gas_used BIGINT,
  gas_price BIGINT,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

-- ─── FACE VERIFICATIONS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS face_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_id UUID REFERENCES verifications(id),
  confidence_score DECIMAL(5, 2),
  is_match BOOLEAN,
  liveness_score DECIMAL(5, 2),
  liveness_passed BOOLEAN,
  image_url TEXT,
  api_response JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_degrees_graduate ON degrees(graduate_id);
CREATE INDEX idx_degrees_institution ON degrees(issuing_institution_id);
CREATE INDEX idx_degrees_hash ON degrees(degree_hash);
CREATE INDEX idx_degrees_status ON degrees(status);
CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_degree ON documents(degree_id);
CREATE INDEX idx_verifications_degree ON verifications(degree_id);
CREATE INDEX idx_verifications_code ON verifications(verification_code);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_blockchain_tx_hash ON blockchain_transactions(tx_hash);

-- ─── UPDATED AT TRIGGER ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_degrees_updated_at
  BEFORE UPDATE ON degrees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_verifications_updated_at
  BEFORE UPDATE ON verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();