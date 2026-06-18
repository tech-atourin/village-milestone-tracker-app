-- =====================================================
-- 0007: Per-topik kuisioner + per-topik test scores, plus SWOT insight
-- =====================================================
-- 1) Allow narasumber kuisioner and peserta test results to be scoped to
--    a specific materi/topik so we can show per-materi growth + ratings.
-- 2) Add 'swot' to the ai_insight_type enum so SWOT analysis per desa can
--    be stored alongside summary/recommendation in vmt.ai_insights.

ALTER TABLE vmt.narasumber_ratings
  ADD COLUMN IF NOT EXISTS project_topik_id uuid
    REFERENCES vmt.project_topik(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_narasumber_ratings_topik
  ON vmt.narasumber_ratings(project_topik_id);

ALTER TABLE vmt.peserta_test_results
  ADD COLUMN IF NOT EXISTS project_topik_id uuid
    REFERENCES vmt.project_topik(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_peserta_test_results_topik
  ON vmt.peserta_test_results(project_topik_id);

-- Extend ai_insight_type enum with 'swot' if it isn't there yet.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'ai_insight_type' AND e.enumlabel = 'swot'
  ) THEN
    ALTER TYPE vmt.ai_insight_type ADD VALUE 'swot';
  END IF;
END $$;
