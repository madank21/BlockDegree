-- 005_production_fixes.sql
-- Production fixes from June 2026 audit (CRITICAL-1, CRITICAL-4, HIGH-3)

-- CRITICAL-1: Student applications have no institution until admin/university assigns one
ALTER TABLE degrees ALTER COLUMN institution_id DROP NOT NULL;

-- CRITICAL-4: Migration 001 created trg_cert_number; migration 002 added trg_certificate_number
-- Both fire on INSERT — drop the legacy trigger so only one certificate format is generated
DROP TRIGGER IF EXISTS trg_cert_number ON degrees;

-- HIGH-3: users table was missing RLS while other sensitive tables had it enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role bypass" ON users;
CREATE POLICY "Service role bypass" ON users USING (false);
