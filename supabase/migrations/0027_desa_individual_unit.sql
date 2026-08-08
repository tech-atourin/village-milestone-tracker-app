-- Unit peserta individu (project pelaku_pariwisata) me-reuse mesin desa:
-- tiap peserta diberi 1 "desa" tersembunyi sebagai wadah checklist/evidence/
-- rencana aksi. Flag ini menandainya supaya tidak muncul di master desa &
-- analitik desa (peserta individu memang tidak punya desa nyata).
alter table vmt.desa
  add column if not exists is_individual_unit boolean not null default false;

create index if not exists idx_desa_individual_unit
  on vmt.desa (is_individual_unit)
  where is_individual_unit = true;
