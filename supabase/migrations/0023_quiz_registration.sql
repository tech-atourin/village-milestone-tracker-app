-- 0023_quiz_registration.sql
-- Pendaftaran pra-pretest: peserta yang belum punya akun mengisi data diri
-- sebelum mengerjakan pre-test. Data ini jadi bahan admin/mitra membuat akun.
create type vmt.quiz_registration_status as enum ('pending', 'converted');

create table vmt.quiz_registrations (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references vmt.quizzes(id) on delete cascade,
  project_id uuid not null references vmt.projects(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  nik text,
  gender text,
  birthdate date,
  -- Desa dari dropdown (kalau dipilih) atau isian bebas (kalau "Lainnya").
  desa_id uuid references vmt.desa(id) on delete set null,
  desa_other text,
  jabatan text,
  instansi text,
  kota text,
  status vmt.quiz_registration_status not null default 'pending',
  created_user_id uuid references vmt.users(id) on delete set null,
  converted_at timestamptz,
  attempt_id uuid references vmt.quiz_attempts(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_quiz_reg_quiz on vmt.quiz_registrations(quiz_id);
create index idx_quiz_reg_project on vmt.quiz_registrations(project_id);
create index idx_quiz_reg_status on vmt.quiz_registrations(project_id, status);

alter table vmt.quiz_registrations enable row level security;
-- Baca hanya untuk superadmin + anggota project (peserta biasa tidak perlu).
-- Insert publik dan pembuatan akun dilakukan lewat server action (service role),
-- jadi tidak ada policy insert/update untuk peran biasa.
create policy read_quiz_registrations on vmt.quiz_registrations
  for select to authenticated
  using (
    vmt.is_superadmin()
    or project_id in (select vmt.auth_user_projects())
  );

-- Flag: apakah kuis meminta pendaftaran data diri sebelum dikerjakan.
-- Cocok untuk pre-test yang pesertanya belum punya akun.
alter table vmt.quizzes
  add column if not exists collect_registration boolean not null default false;

comment on column vmt.quizzes.collect_registration is
  'Bila true, peserta publik mengisi form pendaftaran (data diri) sebelum masuk ke soal. Dipakai untuk pre-test.';
