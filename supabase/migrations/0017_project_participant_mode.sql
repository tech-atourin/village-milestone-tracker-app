-- 0017_project_participant_mode.sql
-- Participant mode + target counts at project level. Drives planning + the
-- "online = pelatihan saja, offline = full (checklist/rencana aksi/rapor/
-- sertifikat)" distinction. Per-peserta behavior is still governed by
-- project_memberships.attendance_mode; these are project-level targets.
alter table vmt.projects
  add column if not exists participant_mode text not null default 'offline',
  add column if not exists target_online int not null default 0,
  add column if not exists target_offline int not null default 0;

alter table vmt.projects
  add constraint projects_participant_mode_check
    check (participant_mode in ('offline', 'online', 'both'));
