-- 0019_project_resources.sql
-- "Materi & Tautan": per-project collection of downloadable files (PDF, Excel,
-- video, foto, rekaman) AND links (pre/post-test, form evaluasi, dll).
-- Managed by superadmin / mitra_admin; visible to project members (peserta).
-- Dynamic per project. Files live in the private vmt-evidence bucket under
-- resources/{project_id}/... and are served to peserta via short-lived signed
-- URLs. Large media (video/rekaman zoom) should be added as a link.

create type vmt.resource_kind as enum ('file', 'link');

create table vmt.project_resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references vmt.projects(id) on delete cascade,
  kind vmt.resource_kind not null,
  title text not null,
  description text,
  -- Free label for grouping/badge, e.g. Materi / Perhitungan / Video / Foto /
  -- Rekaman / Tes / Evaluasi / Lainnya. Nullable.
  category text,
  -- file fields (kind = 'file')
  file_url text,             -- storage path in vmt-evidence
  file_type text,            -- image | video | audio | document | other
  mime_type text,
  file_size_bytes bigint,
  original_filename text,
  -- link fields (kind = 'link')
  url text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_by uuid references vmt.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_resources_kind_payload check (
    (kind = 'file' and file_url is not null)
    or (kind = 'link' and url is not null)
  )
);
create index idx_project_resources_project on vmt.project_resources(project_id);
create index idx_project_resources_order on vmt.project_resources(project_id, sort_order);

alter table vmt.project_resources enable row level security;

-- Read: superadmin, or any member of the project (peserta/narasumber/mitra).
-- Publish filtering (is_published) is enforced at the query layer for peserta;
-- staff manage through the service-role admin client.
create policy read_project_resources on vmt.project_resources
  for select to authenticated
  using (
    vmt.is_superadmin()
    or project_id in (select vmt.auth_user_projects())
  );

-- Writes are performed by superadmin / mitra_admin exclusively through the
-- service-role admin client with app-level access guards (see
-- server/actions/resources.ts), so no authenticated write policy is defined.
