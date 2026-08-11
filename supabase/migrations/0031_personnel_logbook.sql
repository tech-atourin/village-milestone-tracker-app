-- Log Book Personil: tim pelaksana project (role personil) mencatat agenda
-- harian selama masa kerja. Multiple agenda per hari, tiap agenda bisa punya
-- beberapa gambar.

-- Personil per project (rentang kerja manual per orang).
create table if not exists vmt.project_personnel (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references vmt.projects(id) on delete cascade,
  user_id uuid not null references vmt.users(id) on delete cascade,
  position text not null,
  phone text,
  work_start date,
  work_end date,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);
create index if not exists idx_project_personnel_project on vmt.project_personnel (project_id);
create index if not exists idx_project_personnel_user on vmt.project_personnel (user_id);

-- Entri log book harian (satu baris per agenda; multiple per tanggal).
create table if not exists vmt.personnel_logbook (
  id uuid primary key default gen_random_uuid(),
  project_personnel_id uuid not null references vmt.project_personnel(id) on delete cascade,
  entry_date date not null,
  agenda text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_logbook_personnel_date on vmt.personnel_logbook (project_personnel_id, entry_date);

-- Media (gambar) per agenda.
create table if not exists vmt.personnel_logbook_media (
  id uuid primary key default gen_random_uuid(),
  logbook_id uuid not null references vmt.personnel_logbook(id) on delete cascade,
  file_url text not null,
  original_filename text,
  uploaded_at timestamptz not null default now()
);
create index if not exists idx_logbook_media_logbook on vmt.personnel_logbook_media (logbook_id);

-- RLS: personil hanya akses log book-nya sendiri. Admin lewat service role.
alter table vmt.project_personnel enable row level security;
alter table vmt.personnel_logbook enable row level security;
alter table vmt.personnel_logbook_media enable row level security;

drop policy if exists pp_self on vmt.project_personnel;
create policy pp_self on vmt.project_personnel
  for select using (user_id = auth.uid());

drop policy if exists lb_self on vmt.personnel_logbook;
create policy lb_self on vmt.personnel_logbook
  for all using (
    exists (
      select 1 from vmt.project_personnel pp
      where pp.id = project_personnel_id and pp.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from vmt.project_personnel pp
      where pp.id = project_personnel_id and pp.user_id = auth.uid()
    )
  );

drop policy if exists lbm_self on vmt.personnel_logbook_media;
create policy lbm_self on vmt.personnel_logbook_media
  for all using (
    exists (
      select 1 from vmt.personnel_logbook l
      join vmt.project_personnel pp on pp.id = l.project_personnel_id
      where l.id = logbook_id and pp.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from vmt.personnel_logbook l
      join vmt.project_personnel pp on pp.id = l.project_personnel_id
      where l.id = logbook_id and pp.user_id = auth.uid()
    )
  );
