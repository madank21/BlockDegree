-- ─────────────────────────────────────────────────────────────────────────────
-- BlockDegree — Audit Fix Migration
-- Run AFTER 001_initial_schema.sql
-- Addresses all issues found in BlockDegree_Audit_Report.docx
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 1: users table — add missing columns for password reset & email verify
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_reset_token    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS password_reset_expires  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verify_token      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email_verify_expires    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refresh_token           TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token_expires   TIMESTAMPTZ;

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token
  ON users(password_reset_token)
  WHERE password_reset_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_verify_token
  ON users(email_verify_token)
  WHERE email_verify_token IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 2: blockchain_transactions — set DEFAULT on operation column
-- (was NOT NULL without DEFAULT; savePendingTransaction omitted it → crash)
-- ─────────────────────────────────────────────────────────────────────────────

-- If the column already exists with NOT NULL but no default, add default:
DO $$
BEGIN
  -- Check if operation column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blockchain_transactions' AND column_name = 'operation'
  ) THEN
    -- Set a safe default so existing inserts without operation don't fail
    ALTER TABLE blockchain_transactions
      ALTER COLUMN operation SET DEFAULT 'issue';
  ELSE
    -- Column missing entirely — add it
    ALTER TABLE blockchain_transactions
      ADD COLUMN operation VARCHAR(50) NOT NULL DEFAULT 'issue'
        CHECK (operation IN ('issue', 'revoke', 'verify'));
  END IF;
END $$;

-- Add token_id column (for getDegreeByTokenId lookup)
ALTER TABLE blockchain_transactions
  ADD COLUMN IF NOT EXISTS token_id    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bctx_token_id ON blockchain_transactions(token_id)
  WHERE token_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 3: verification_logs — add verification_code column
-- (controller called findByCode which queries verification_code; column was absent)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE verification_logs
  ADD COLUMN IF NOT EXISTS verification_code    VARCHAR(20)   UNIQUE,
  ADD COLUMN IF NOT EXISTS expires_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status               VARCHAR(20)
    CHECK (status IN ('pending', 'verified', 'rejected', 'expired', 'flagged')),
  ADD COLUMN IF NOT EXISTS blockchain_verified  BOOLEAN       DEFAULT false,
  ADD COLUMN IF NOT EXISTS document_verified    BOOLEAN       DEFAULT false,
  ADD COLUMN IF NOT EXISTS fraud_check_passed   BOOLEAN       DEFAULT true,
  ADD COLUMN IF NOT EXISTS fraud_score          DECIMAL(5,4)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_result  JSONB         DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS requester_email      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS requester_organization VARCHAR(200),
  ADD COLUMN IF NOT EXISTS requested_by         UUID          REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purpose              TEXT,
  ADD COLUMN IF NOT EXISTS ip_address           INET,
  ADD COLUMN IF NOT EXISTS user_agent           TEXT,
  ADD COLUMN IF NOT EXISTS notes                TEXT,
  ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vlog_code
  ON verification_logs(verification_code)
  WHERE verification_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vlog_status ON verification_logs(status);

-- Auto-generate a short verification code for new rows
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_code IS NULL THEN
    NEW.verification_code := upper(substring(md5(random()::text) for 8));
  END IF;
  -- Default expiry: 30 days
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verification_code ON verification_logs;
CREATE TRIGGER trg_verification_code
  BEFORE INSERT ON verification_logs
  FOR EACH ROW EXECUTE FUNCTION generate_verification_code();

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 4: degrees — ensure certificate_number trigger exists
-- (auto-generate human-readable certificate numbers)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.certificate_number IS NULL THEN
    NEW.certificate_number :=
      'CERT-' ||
      upper(substring(md5(NEW.degree_hash) for 4)) || '-' ||
      to_char(NOW(), 'YYYY') || '-' ||
      lpad(nextval('cert_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS cert_number_seq START 1000;

DROP TRIGGER IF EXISTS trg_certificate_number ON degrees;
CREATE TRIGGER trg_certificate_number
  BEFORE INSERT ON degrees
  FOR EACH ROW EXECUTE FUNCTION generate_certificate_number();

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 5: backups directory table for tracking backup metadata
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS backup_logs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  backup_id   VARCHAR(100) NOT NULL,
  created_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  file_path   TEXT,
  file_size   BIGINT,
  status      VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  metadata    JSONB       DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 6: documents table — add missing yolo / ocr / validation columns
-- (Document.js model references these; they may not be in the initial schema)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS ocr_status           VARCHAR(20)  DEFAULT 'pending'
    CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS yolo_status          VARCHAR(20)  DEFAULT 'pending'
    CHECK (yolo_status IN ('pending', 'processing', 'valid', 'suspicious', 'fraudulent')),
  ADD COLUMN IF NOT EXISTS validation_status    VARCHAR(20)  DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'valid', 'mismatch', 'invalid')),
  ADD COLUMN IF NOT EXISTS ocr_text             TEXT,
  ADD COLUMN IF NOT EXISTS extracted_data       JSONB        DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS yolo_detections      JSONB        DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS yolo_valid           BOOLEAN,
  ADD COLUMN IF NOT EXISTS yolo_confidence      DECIMAL(5,4),
  ADD COLUMN IF NOT EXISTS validation_errors    JSONB        DEFAULT '[]';

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 7: fraud_logs — clarify resolved status via is_fraudulent
-- (adminController previously used Sequelize .resolved column; we use is_fraudulent)
-- ─────────────────────────────────────────────────────────────────────────────

-- No structural change needed — `is_fraudulent` already in schema.
-- Controllers updated to use is_fraudulent = false for "resolved".
-- Add an optional resolved_at for audit trail:
ALTER TABLE fraud_logs
  ADD COLUMN IF NOT EXISTS resolved_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by  UUID  REFERENCES users(id) ON DELETE SET NULL;