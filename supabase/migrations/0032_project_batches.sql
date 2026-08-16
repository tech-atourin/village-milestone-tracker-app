-- Batch/gelombang peserta dalam sebuah project (modul opsional 'batch').
create table if not exists vmt.project_batches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references vmt.projects(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  quota integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_project_batches_project on vmt.project_batches (project_id);

-- Peserta ditautkan ke batch (opsional).
alter table vmt.project_memberships
  add column if not exists batch_id uuid references vmt.project_batches(id) on delete set null;
create index if not exists idx_project_memberships_batch on vmt.project_memberships (batch_id);

-- RLS: superadmin penuh; anggota project boleh baca batch project-nya.
-- Staff (mitra/atourin) menulis via service role di server actions.
alter table vmt.project_batches enable row level security;
drop policy if exists read_project_batches on vmt.project_batches;
create policy read_project_batches on vmt.project_batches
  for select using (
    vmt.is_superadmin() or project_id in (select vmt.auth_user_projects())
  );
