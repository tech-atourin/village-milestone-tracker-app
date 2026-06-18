-- =====================================================
-- Seed: per-materi test scores + per-materi narasumber ratings + AI insights
-- =====================================================
-- Populates the demo project (55555555-...) with:
-- 1) Per-topik narasumber kuisioner ratings (each narasumber covers 2-3 topik).
-- 2) Per-topik pre-test + post-test scores for every active peserta.
-- 3) AI insights per project_desa: summary, recommendation, swot.
-- =====================================================

-- 1. Backfill narasumber_ratings.project_topik_id.
WITH topik AS (
  SELECT id, sort_order FROM vmt.project_topik
  WHERE project_id = '55555555-5555-5555-5555-555555555555' ORDER BY sort_order
), narasumber AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn FROM vmt.users
  WHERE id IN (
    SELECT DISTINCT narasumber_id FROM vmt.narasumber_ratings
    WHERE project_id = '55555555-5555-5555-5555-555555555555'
  )
), assignment AS (
  SELECT n.id AS narasumber_id, t.id AS topik_id, t.sort_order FROM narasumber n
  CROSS JOIN topik t
  WHERE (t.sort_order = ((n.rn - 1) % 7) + 1
      OR t.sort_order = ((n.rn) % 7) + 1
      OR t.sort_order = ((n.rn + 1) % 7) + 1)
)
UPDATE vmt.narasumber_ratings r
SET project_topik_id = a.topik_id
FROM assignment a
WHERE r.narasumber_id = a.narasumber_id
  AND r.project_id = '55555555-5555-5555-5555-555555555555'
  AND r.project_topik_id IS NULL
  AND a.sort_order = ((ABS(HASHTEXT(r.id::text)) % 3) +
      (SELECT MIN(sort_order) FROM assignment a2 WHERE a2.narasumber_id = r.narasumber_id));

-- 2. Reseed peserta_test_results to peserta x topik grid.
DELETE FROM vmt.peserta_test_results
WHERE project_gform_id IN (
  'e0000001-0000-0000-0000-000000000001'::uuid,
  'e0000002-0000-0000-0000-000000000002'::uuid
);

WITH peserta AS (
  SELECT u.id AS user_id, u.full_name, u.email,
    ROW_NUMBER() OVER (ORDER BY u.id) AS pn
  FROM vmt.project_memberships pm JOIN vmt.users u ON u.id = pm.user_id
  WHERE pm.project_id = '55555555-5555-5555-5555-555555555555'
    AND pm.role = 'peserta' AND pm.status = 'active'
), topik AS (
  SELECT id, name, sort_order,
    CASE sort_order WHEN 1 THEN 58 WHEN 2 THEN 62 WHEN 3 THEN 65
                    WHEN 4 THEN 55 WHEN 5 THEN 50 WHEN 6 THEN 60 WHEN 7 THEN 48
    END AS base_pre,
    CASE sort_order WHEN 1 THEN 78 WHEN 2 THEN 88 WHEN 3 THEN 86
                    WHEN 4 THEN 82 WHEN 5 THEN 70 WHEN 6 THEN 84 WHEN 7 THEN 72
    END AS base_post
  FROM vmt.project_topik WHERE project_id = '55555555-5555-5555-5555-555555555555'
)
INSERT INTO vmt.peserta_test_results
  (project_gform_id, user_id, project_topik_id, raw_response, score, max_score, submitted_at, matched_status)
SELECT
  'e0000001-0000-0000-0000-000000000001'::uuid,
  p.user_id, t.id,
  jsonb_build_object('Email Address', p.email, 'Nama', p.full_name, 'Materi', t.name),
  GREATEST(35, LEAST(95, t.base_pre + ((p.pn % 5) - 2) * 3))::numeric, 100,
  '2026-09-01 09:00:00+07'::timestamptz + (t.sort_order || ' days')::interval + (p.pn || ' minutes')::interval,
  'matched'::vmt.test_match_status
FROM peserta p CROSS JOIN topik t
UNION ALL
SELECT
  'e0000002-0000-0000-0000-000000000002'::uuid,
  p.user_id, t.id,
  jsonb_build_object('Email Address', p.email, 'Nama', p.full_name, 'Materi', t.name),
  GREATEST(50, LEAST(100, t.base_post + ((p.pn % 4) - 1) * 4))::numeric, 100,
  '2026-10-15 14:00:00+07'::timestamptz + (t.sort_order || ' days')::interval + (p.pn || ' minutes')::interval,
  'matched'::vmt.test_match_status
FROM peserta p CROSS JOIN topik t;

-- 3. AI insights per project_desa — see app/supabase/seed-ai-insights-demo.sql
-- (kept in a separate file because it's a long narrative payload).
