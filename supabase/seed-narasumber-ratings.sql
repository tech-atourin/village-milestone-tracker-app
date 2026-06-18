-- =====================================================
-- Seed: dummy narasumber kuisioner ratings
-- =====================================================
-- Populates vmt.narasumber_ratings for the demo project so the Project
-- analytics "Top Narasumber (by Kuisioner)" chart has real-looking data.
-- Re-running is safe — the (narasumber_id, rater_id, project_id) unique
-- constraint prevents duplicates.
-- =====================================================

WITH peserta AS (
  SELECT pm.user_id, ROW_NUMBER() OVER (ORDER BY pm.user_id) AS pn
  FROM vmt.project_memberships pm
  WHERE pm.project_id = '55555555-5555-5555-5555-555555555555'
    AND pm.role = 'peserta' AND pm.status = 'active'
), narasumber(id, base_score) AS (
  VALUES
    ('b0000003-0000-0000-0000-000000000003'::uuid, 4.7),  -- Rini Saraswati
    ('b0000002-0000-0000-0000-000000000002'::uuid, 4.5),  -- Made Suparta
    ('b0000004-0000-0000-0000-000000000004'::uuid, 4.3),  -- Wayan Asmara
    ('b0000001-0000-0000-0000-000000000001'::uuid, 4.1),  -- Hadi Susilo
    ('b0000005-0000-0000-0000-000000000005'::uuid, 3.9),  -- Eko Pranowo
    ('b0000006-0000-0000-0000-000000000006'::uuid, 3.7)   -- Indah Permatasari
)
INSERT INTO vmt.narasumber_ratings (
  narasumber_id, rater_id, project_id, rating, comment, created_at, updated_at
)
SELECT
  n.id,
  p.user_id,
  '55555555-5555-5555-5555-555555555555',
  GREATEST(1, LEAST(5,
    ROUND(n.base_score + ((p.pn % 3) - 1) * 0.4)::int
  )),
  CASE ((p.pn + ABS(HASHTEXT(n.id::text))) % 4)
    WHEN 0 THEN 'Penjelasan materi sangat mudah dipahami.'
    WHEN 1 THEN 'Sangat membantu, contoh kasusnya konkret.'
    WHEN 2 THEN 'Cukup baik, semoga sesi berikutnya lebih interaktif.'
    ELSE NULL
  END,
  now() - (RANDOM() * INTERVAL '30 days'),
  now()
FROM peserta p
CROSS JOIN narasumber n
ON CONFLICT (narasumber_id, rater_id, project_id) DO NOTHING;
