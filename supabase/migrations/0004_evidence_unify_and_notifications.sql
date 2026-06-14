-- =====================================================
-- 0004: Unify V1 assessment evidence with project evidence_files
--       + add read_at column to notifications for the new
--       /notifications page (mark-as-read flow).
-- =====================================================

-- ---------- Evidence files: anchor to desa OR project ----------
-- Existing column: project_desa_id (was NOT NULL).
-- New: desa_id (nullable) — used when a desa uploads bukti directly
-- to a national_criteria_progress without a project context.
-- Old peserta evidence keeps project_desa_id; cross-link picker
-- joins both via evidence_tags (tag_type='national_criteria_progress'
-- which the enum already supports).
ALTER TABLE vmt.evidence_files
  ALTER COLUMN project_desa_id DROP NOT NULL;

ALTER TABLE vmt.evidence_files
  ADD COLUMN IF NOT EXISTS desa_id uuid REFERENCES vmt.desa(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_evidence_files_desa
  ON vmt.evidence_files(desa_id) WHERE desa_id IS NOT NULL;

-- ---------- Notifications: read_at ----------
ALTER TABLE vmt.notifications
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON vmt.notifications(user_id, created_at DESC) WHERE read_at IS NULL;
