-- 0018_topik_check_ins.sql
-- Per-topik attendance check-in by peserta. One check-in per (topik, peserta).
create table vmt.topik_check_ins (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references vmt.projects(id) on delete cascade,
  project_topik_id uuid not null references vmt.project_topik(id) on delete cascade,
  user_id uuid not null references vmt.users(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  unique (project_topik_id, user_id)
);
create index idx_topik_checkins_project on vmt.topik_check_ins(project_id);
create index idx_topik_checkins_user on vmt.topik_check_ins(user_id);

alter table vmt.topik_check_ins enable row level security;

create policy read_topik_checkins on vmt.topik_check_ins
  for select to authenticated
  using (
    vmt.is_superadmin()
    or user_id = auth.uid()
    or project_id in (select vmt.auth_user_projects())
  );

create policy insert_own_topik_checkins on vmt.topik_check_ins
  for insert to authenticated
  with check (user_id = auth.uid());

create policy delete_own_topik_checkins on vmt.topik_check_ins
  for delete to authenticated
  using (user_id = auth.uid() or vmt.is_superadmin());
