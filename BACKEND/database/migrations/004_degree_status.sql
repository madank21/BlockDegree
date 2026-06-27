-- 004_degree_status.sql
-- Add 'approved' to degree lifecycle status (university review workflow)

ALTER TABLE degrees DROP CONSTRAINT IF EXISTS degrees_status_check;
ALTER TABLE degrees ADD CONSTRAINT degrees_status_check
  CHECK (status IN ('pending', 'approved', 'issued', 'revoked', 'suspended'));
