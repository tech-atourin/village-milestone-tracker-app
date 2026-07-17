-- 0016_quiz_attempts_tighten_rls.sql
-- Tighten authenticated read on quiz_attempts/quiz_answers: a non-admin can
-- only read their OWN matched attempts. Admin panels read via service_role
-- (bypasses RLS), so this doesn't affect the results tab. Prevents a peserta
-- from enumerating other respondents' attempts of a shared project.

drop policy if exists read_quiz_attempts on vmt.quiz_attempts;
create policy read_quiz_attempts on vmt.quiz_attempts
  for select to authenticated
  using (vmt.is_superadmin() or matched_user_id = auth.uid());

drop policy if exists read_quiz_answers on vmt.quiz_answers;
create policy read_quiz_answers on vmt.quiz_answers
  for select to authenticated
  using (
    vmt.is_superadmin()
    or attempt_id in (
      select a.id from vmt.quiz_attempts a where a.matched_user_id = auth.uid()
    )
  );
