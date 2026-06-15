-- =====================================================
-- 0005: Narasumber ratings
-- =====================================================
-- Peserta rate the narasumber who mentored them, scoped per project.
-- A narasumber's directory/detail shows the accumulated average across
-- all ratings. One rating per (narasumber, rater, project) — re-rating
-- updates the existing row.
--
-- Writes go through server actions using the admin client (which also
-- enforces that the rater is a peserta in the same project as the
-- narasumber), so RLS is enabled with no broad write policy.
-- =====================================================

CREATE TABLE IF NOT EXISTS vmt.narasumber_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  narasumber_id uuid NOT NULL REFERENCES vmt.users(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES vmt.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES vmt.projects(id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (narasumber_id, rater_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_narasumber_ratings_narasumber
  ON vmt.narasumber_ratings(narasumber_id);
CREATE INDEX IF NOT EXISTS idx_narasumber_ratings_project
  ON vmt.narasumber_ratings(project_id);

ALTER TABLE vmt.narasumber_ratings ENABLE ROW LEVEL SECURITY;
