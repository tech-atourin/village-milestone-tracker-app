-- 0009_narasumber_ratings_rls.sql
-- narasumber_ratings had RLS enabled (via 0005) but no policies attached, so
-- every authenticated read returned 0 rows. That broke:
--   - "Sebaran Rating Kuisioner Narasumber" chart (always empty)
--   - "Top 5 Narasumber by Kuisioner" chart
--   - Per-materi kuisioner avg displayed on /atourin/narasumber/[id]
--   - Mitra equivalents
-- Mirror peserta_test_results' policy pattern: staff (superadmin) see all,
-- project members see ratings on their own projects, raters/narasumber see
-- their own row.

CREATE POLICY read_narasumber_ratings ON vmt.narasumber_ratings
  FOR SELECT TO authenticated
  USING (
    vmt.is_superadmin()
    OR project_id IN (SELECT vmt.auth_user_projects())
    OR rater_id = auth.uid()
    OR narasumber_id = auth.uid()
  );

CREATE POLICY insert_narasumber_ratings ON vmt.narasumber_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    vmt.is_superadmin()
    OR rater_id = auth.uid()
  );

CREATE POLICY update_narasumber_ratings ON vmt.narasumber_ratings
  FOR UPDATE TO authenticated
  USING (vmt.is_superadmin() OR rater_id = auth.uid())
  WITH CHECK (vmt.is_superadmin() OR rater_id = auth.uid());

CREATE POLICY delete_narasumber_ratings ON vmt.narasumber_ratings
  FOR DELETE TO authenticated
  USING (vmt.is_superadmin() OR rater_id = auth.uid());
