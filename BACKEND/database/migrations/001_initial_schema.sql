-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  VARCHAR(200) NOT NULL,
  email                 VARCHAR(255) UNIQUE NOT NULL,
  password_hash         VARCHAR(255) NOT NULL,
  role                  VARCHAR(20) NOT NULL CHECK (role IN ('admin','university','student','employer')),
  student_id            VARCHAR(100),
  institution_id        UUID,
  institution_name      VARCHAR(200),
  wallet_address        VARCHAR(42),
  face_descriptor       TEXT,
  face_descriptor_hash  VARCHAR(66),
  face_registered_at    TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  email_verified        BOOLEAN NOT NULL DEFAULT false,
  avatar_url            TEXT,
  last_login            TIMESTAMPTZ,
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_institution ON users(institution_id);

-- DEGREES
CREATE TABLE IF NOT EXISTS degrees (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_name            VARCHAR(200) NOT NULL,
  student_id              VARCHAR(100) NOT NULL,
  graduate_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  graduate_email          VARCHAR(255),
  degree_title            VARCHAR(300) NOT NULL,
  field_of_study          VARCHAR(300) NOT NULL,
  graduation_date         DATE NOT NULL,
  gpa                     DECIMAL(4,2),
  honors                  VARCHAR(100),
  metadata                JSONB DEFAULT '{}',
  institution_id          UUID NOT NULL,
  institution_name        VARCHAR(200),
  issued_by               UUID REFERENCES users(id) ON DELETE SET NULL,
  degree_hash             VARCHAR(64) UNIQUE NOT NULL,
  certificate_number      VARCHAR(100) UNIQUE,
  status                  VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','issued','revoked','suspended')),
  blockchain_sync_status  VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (blockchain_sync_status IN ('queued','processing','success','failed','queue_error')),
  blockchain_tx_hash      VARCHAR(66),
  blockchain_block_number BIGINT,
  blockchain_timestamp    BIGINT,
  revocation_reason       TEXT,
  revoked_at              TIMESTAMPTZ,
  revocation_tx_hash      VARCHAR(66),
  qr_code_url             TEXT,
  ipfs_cid                VARCHAR(200),
  ipfs_gateway_url        TEXT,
  document_hash           VARCHAR(64),
  document_url            TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_degrees_student_id ON degrees(student_id);
CREATE INDEX idx_degrees_degree_hash ON degrees(degree_hash);
CREATE INDEX idx_degrees_institution_id ON degrees(institution_id);
CREATE INDEX idx_degrees_status ON degrees(status);
CREATE INDEX idx_degrees_bc_sync ON degrees(blockchain_sync_status);
CREATE INDEX idx_degrees_graduate_id ON degrees(graduate_id);
CREATE INDEX idx_degrees_created_at ON degrees(created_at DESC);

-- Auto‑generate certificate number
CREATE SEQUENCE IF NOT EXISTS certificate_seq START 100000 INCREMENT 1;
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.certificate_number IS NULL THEN
    NEW.certificate_number := 'BD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('certificate_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_certificate_number ON degrees;
CREATE TRIGGER trg_certificate_number BEFORE INSERT ON degrees FOR EACH ROW EXECUTE FUNCTION generate_certificate_number();

-- Auto‑update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_degrees_updated_at ON degrees;
CREATE TRIGGER trg_degrees_updated_at BEFORE UPDATE ON degrees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- VERIFICATION LOGS
CREATE TABLE IF NOT EXISTS verification_logs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  computed_hash         VARCHAR(64),
  result                VARCHAR(20) NOT NULL CHECK (result IN ('valid','invalid','revoked')),
  verifier_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  verifier_ip           VARCHAR(45),
  degree_id             UUID REFERENCES degrees(id) ON DELETE SET NULL,
  verification_method   VARCHAR(20) CHECK (verification_method IN ('hash','qr','ocr','face')),
  on_chain_record       JSONB DEFAULT '{}',
  metadata              JSONB DEFAULT '{}',
  verified_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vlog_hash ON verification_logs(computed_hash);
CREATE INDEX idx_vlog_degree_id ON verification_logs(degree_id);
CREATE INDEX idx_vlog_result ON verification_logs(result);
CREATE INDEX idx_vlog_ip ON verification_logs(verifier_ip);
CREATE INDEX idx_vlog_date ON verification_logs(verified_at DESC);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action      VARCHAR(100) NOT NULL,
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role  VARCHAR(20),
  target_id   TEXT,
  target_type VARCHAR(50),
  details     JSONB DEFAULT '{}',
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_alog_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_alog_action ON audit_logs(action);
CREATE INDEX idx_alog_date ON audit_logs(created_at DESC);

-- FRAUD LOGS
CREATE TABLE IF NOT EXISTS fraud_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name       VARCHAR(500),
  file_hash       VARCHAR(64),
  fraud_score     INTEGER NOT NULL DEFAULT 0 CHECK (fraud_score BETWEEN 0 AND 100),
  risk_level      VARCHAR(20) NOT NULL DEFAULT 'MINIMAL' CHECK (risk_level IN ('MINIMAL','LOW','MEDIUM','HIGH','CRITICAL')),
  is_fraudulent   BOOLEAN NOT NULL DEFAULT false,
  findings        JSONB NOT NULL DEFAULT '[]',
  breakdown       JSONB DEFAULT '{}',
  yolo_detections JSONB DEFAULT '{}',
  ocr_confidence  DECIMAL(5,2),
  reported_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  degree_id       UUID REFERENCES degrees(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_fraud_fraudulent ON fraud_logs(is_fraudulent);
CREATE INDEX idx_fraud_risk ON fraud_logs(risk_level);
CREATE INDEX idx_fraud_date ON fraud_logs(created_at DESC);

-- FACE VERIFICATION LOGS
CREATE TABLE IF NOT EXISTS face_verification_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  distance    DECIMAL(6,4) NOT NULL,
  confidence  INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  is_match    BOOLEAN NOT NULL,
  threshold   DECIMAL(4,2) DEFAULT 0.60,
  provider    VARCHAR(50) DEFAULT 'face-api',
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_fvlog_user_id ON face_verification_logs(user_id);
CREATE INDEX idx_fvlog_is_match ON face_verification_logs(is_match);
CREATE INDEX idx_fvlog_date ON face_verification_logs(verified_at DESC);

-- IPFS DOCUMENTS
CREATE TABLE IF NOT EXISTS ipfs_documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  degree_id     UUID REFERENCES degrees(id) ON DELETE SET NULL,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  cid           VARCHAR(200) NOT NULL UNIQUE,
  local_hash    VARCHAR(64) NOT NULL,
  gateway_url   TEXT,
  pinata_url    TEXT,
  file_size     BIGINT,
  file_type     VARCHAR(100),
  document_type VARCHAR(50) DEFAULT 'degree' CHECK (document_type IN ('degree','transcript','cnic','selfie','other')),
  is_pinned     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ipfs_degree_id ON ipfs_documents(degree_id);
CREATE INDEX idx_ipfs_cid ON ipfs_documents(cid);
CREATE INDEX idx_ipfs_user_id ON ipfs_documents(user_id);

-- BLOCKCHAIN TRANSACTIONS
CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_hash      VARCHAR(66) UNIQUE NOT NULL,
  degree_id    UUID REFERENCES degrees(id) ON DELETE SET NULL,
  operation    VARCHAR(50) NOT NULL CHECK (operation IN ('issue','revoke','verify')),
  status       VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed')),
  block_number BIGINT,
  gas_used     VARCHAR(50),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);
CREATE INDEX idx_bctx_hash ON blockchain_transactions(tx_hash);
CREATE INDEX idx_bctx_degree_id ON blockchain_transactions(degree_id);
CREATE INDEX idx_bctx_status ON blockchain_transactions(status);

-- RLS (enabled, but service role bypasses)
ALTER TABLE degrees           ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipfs_documents    ENABLE ROW LEVEL SECURITY;