-- =====================================================
-- 0003_phase1_rls_writes.sql
-- =====================================================
-- Phase 1 RLS write policies for peserta and mitra:
--   * peserta can submit/revise their own checklist_progress
--   * peserta can upload evidence_files + tag them
--   * peserta can read/write desa_baseline_data for their desa
--   * mitra inherits read access via member_read_projects (already there)
--
-- Helper: is the current user a peserta-member of the given
-- project_desa via project_memberships.desa_id?
-- =====================================================

create or replace function vmt.user_owns_project_desa(p_project_desa_id uuid)
returns boolean
language sql
security definer
stable
set search_path = vmt, public, pg_temp
as $$
  select exists (
    select 1
    from vmt.project_desa pd
    join vmt.project_memberships pm
      on pm.project_id = pd.project_id
     and pm.desa_id = pd.desa_id
    where pd.id = p_project_desa_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
  );
$$;

-- =====================================================
-- checklist_progress
-- =====================================================
create policy "peserta_insert_checklist_progress" on vmt.checklist_progress
  for insert to authenticated
  with check (
    vmt.is_superadmin() or
    (
      submitted_by = auth.uid() and
      desa_topik_instance_id in (
        select id from vmt.desa_topik_instance dti
        where vmt.user_owns_project_desa(dti.project_desa_id)
      )
    )
  );

create policy "peserta_update_own_checklist_progress" on vmt.checklist_progress
  for update to authenticated
  using (
    vmt.is_superadmin() or
    (
      desa_topik_instance_id in (
        select id from vmt.desa_topik_instance dti
        where vmt.user_owns_project_desa(dti.project_desa_id)
      ) and
      status in ('not_started', 'submitted', 'rejected')
    )
  )
  with check (
    vmt.is_superadmin() or
    (
      desa_topik_instance_id in (
        select id from vmt.desa_topik_instance dti
        where vmt.user_owns_project_desa(dti.project_desa_id)
      )
    )
  );

-- =====================================================
-- desa_topik_instance — peserta can create instance rows
-- on first interaction (idempotent upsert from UI)
-- =====================================================
create policy "peserta_insert_desa_topik_instance" on vmt.desa_topik_instance
  for insert to authenticated
  with check (
    vmt.is_superadmin() or vmt.user_owns_project_desa(project_desa_id)
  );

-- =====================================================
-- evidence_files
-- =====================================================
create policy "peserta_insert_evidence" on vmt.evidence_files
  for insert to authenticated
  with check (
    vmt.is_superadmin() or
    (uploaded_by = auth.uid() and vmt.user_owns_project_desa(project_desa_id))
  );

create policy "peserta_update_own_evidence" on vmt.evidence_files
  for update to authenticated
  using (
    vmt.is_superadmin() or
    (uploaded_by = auth.uid() and vmt.user_owns_project_desa(project_desa_id))
  )
  with check (
    vmt.is_superadmin() or
    (uploaded_by = auth.uid() and vmt.user_owns_project_desa(project_desa_id))
  );

-- =====================================================
-- evidence_tags
-- =====================================================
create policy "peserta_tag_evidence" on vmt.evidence_tags
  for insert to authenticated
  with check (
    vmt.is_superadmin() or
    evidence_id in (
      select id from vmt.evidence_files ef
      where vmt.user_owns_project_desa(ef.project_desa_id)
    )
  );

create policy "peserta_untag_evidence" on vmt.evidence_tags
  for delete to authenticated
  using (
    vmt.is_superadmin() or
    evidence_id in (
      select id from vmt.evidence_files ef
      where ef.uploaded_by = auth.uid() and
            vmt.user_owns_project_desa(ef.project_desa_id)
    )
  );

-- =====================================================
-- desa_baseline_data
-- =====================================================
create policy "peserta_read_baseline" on vmt.desa_baseline_data
  for select to authenticated
  using (
    vmt.is_superadmin() or
    project_desa_id in (
      select id from vmt.project_desa pd where pd.project_id in (select vmt.auth_user_projects())
    )
  );

create policy "peserta_insert_baseline" on vmt.desa_baseline_data
  for insert to authenticated
  with check (
    vmt.is_superadmin() or
    (submitted_by = auth.uid() and vmt.user_owns_project_desa(project_desa_id))
  );

create policy "peserta_update_baseline" on vmt.desa_baseline_data
  for update to authenticated
  using (
    vmt.is_superadmin() or vmt.user_owns_project_desa(project_desa_id)
  )
  with check (
    vmt.is_superadmin() or vmt.user_owns_project_desa(project_desa_id)
  );

-- =====================================================
-- feedback — Atourin/pendamping can write; peserta read
-- their own thread context
-- =====================================================
create policy "scope_feedback_read" on vmt.feedback
  for select to authenticated
  using (
    vmt.is_superadmin() or
    -- author themselves
    author_id = auth.uid() or
    -- the feedback target belongs to a project the user is in
    (target_type = 'checklist_progress' and target_id in (
      select cp.id from vmt.checklist_progress cp
      join vmt.desa_topik_instance dti on dti.id = cp.desa_topik_instance_id
      join vmt.project_desa pd on pd.id = dti.project_desa_id
      where pd.project_id in (select vmt.auth_user_projects())
    )) or
    (target_type = 'evidence' and target_id in (
      select ef.id from vmt.evidence_files ef
      where ef.project_desa_id in (
        select id from vmt.project_desa pd where pd.project_id in (select vmt.auth_user_projects())
      )
    ))
  );

create policy "atourin_write_feedback" on vmt.feedback
  for insert to authenticated
  with check (author_id = auth.uid());

-- =====================================================
-- notifications — users read their own
-- =====================================================
create policy "user_read_notifications" on vmt.notifications
  for select to authenticated
  using (user_id = auth.uid() or vmt.is_superadmin());

create policy "superadmin_write_notifications" on vmt.notifications
  for insert to authenticated
  with check (vmt.is_superadmin() or user_id = auth.uid());
