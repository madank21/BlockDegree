-- 003_patches.sql
-- Fixes schema gaps referenced by Verification.js and FraudLog.js

-- verification_logs.result was NOT NULL in 001 but is optional in the new workflow
ALTER TABLE verification_logs
  ALTER COLUMN result DROP NOT NULL;

-- fraud_logs resolution workflow columns
ALTER TABLE fraud_logs
  ADD COLUMN IF NOT EXISTS is_resolved      BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_fraud_logs_resolved
  ON fraud_logs(is_resolved);

-- Auto-update updated_at on verification_logs (missing from 002)
DROP TRIGGER IF EXISTS trg_verification_logs_updated_at ON verification_logs;
CREATE TRIGGER trg_verification_logs_updated_at
  BEFORE UPDATE ON verification_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
