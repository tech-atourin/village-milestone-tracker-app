-- 0015_quiz_module.sql
-- Native quiz/test module: admin authors quizzes, anonymous participants take
-- them via a public CSPRNG link, scores compute server-side, results integrate
-- into project detail + (when matched) into peserta_test_results / rapor.
--
-- Distinct from project_gforms (external Google Form + Sheets sync). Quizzes
-- are hosted natively in VMT.

-- =====================================================
-- Enums
-- =====================================================
create type vmt.quiz_kind as enum ('pre_test', 'post_test', 'standalone');
create type vmt.quiz_question_type as enum ('single_choice', 'true_false');

-- =====================================================
-- quizzes
-- =====================================================
create table vmt.quizzes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references vmt.projects(id) on delete cascade,
  title text not null,
  description text,
  kind vmt.quiz_kind not null default 'standalone',
  -- Optional link to a materi/topik. Required for the pre/post-test bridge
  -- into peserta_test_results.
  topik_id uuid references vmt.project_topik(id) on delete set null,
  time_limit_seconds int,               -- null = no timer
  passing_score numeric(6, 2),          -- null = no pass/fail
  shuffle_questions boolean not null default false,
  public_slug text unique,              -- CSPRNG, null until first publish
  is_published boolean not null default false,
  opens_at timestamptz,                 -- null = open immediately
  closes_at timestamptz,                -- null = never closes
  max_attempts int not null default 1,  -- per respondent email; <=0 = unlimited
  created_by uuid references vmt.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_quizzes_project on vmt.quizzes(project_id);
create index idx_quizzes_slug on vmt.quizzes(public_slug) where public_slug is not null;

-- =====================================================
-- quiz_questions
-- =====================================================
create table vmt.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references vmt.quizzes(id) on delete cascade,
  prompt text not null,
  question_type vmt.quiz_question_type not null default 'single_choice',
  points numeric(6, 2) not null default 1,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index idx_quiz_questions_quiz on vmt.quiz_questions(quiz_id);

-- =====================================================
-- quiz_options
-- =====================================================
create table vmt.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references vmt.quiz_questions(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  sort_order int not null default 0
);
create index idx_quiz_options_question on vmt.quiz_options(question_id);

-- =====================================================
-- quiz_attempts  (one row per public submission)
-- =====================================================
create table vmt.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references vmt.quizzes(id) on delete cascade,
  respondent_name text not null,
  respondent_email text not null,
  respondent_phone text,
  score numeric(8, 2),
  max_score numeric(8, 2),
  percent numeric(6, 2),
  passed boolean,
  started_at timestamptz,
  submitted_at timestamptz not null default now(),
  duration_seconds int,
  -- Identity sync: filled on submit if email matches a user, or later by the
  -- reconcile backfill when a peserta account is created.
  matched_user_id uuid references vmt.users(id) on delete set null,
  matched_status vmt.test_match_status not null default 'unmatched',
  matched_membership_id uuid references vmt.project_memberships(id) on delete set null,
  ip_hash text,                         -- sha256(ip + salt), soft anti-abuse
  created_at timestamptz not null default now()
);
create index idx_quiz_attempts_quiz on vmt.quiz_attempts(quiz_id);
create index idx_quiz_attempts_email on vmt.quiz_attempts(lower(respondent_email));
create index idx_quiz_attempts_matched_user on vmt.quiz_attempts(matched_user_id);

-- =====================================================
-- quiz_answers
-- =====================================================
create table vmt.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references vmt.quiz_attempts(id) on delete cascade,
  question_id uuid not null references vmt.quiz_questions(id) on delete cascade,
  selected_option_ids uuid[] not null default '{}',
  is_correct boolean not null default false,
  points_awarded numeric(6, 2) not null default 0
);
create index idx_quiz_answers_attempt on vmt.quiz_answers(attempt_id);

-- =====================================================
-- Bridge: extend peserta_test_results so native quiz results flow into the
-- existing rapor / training pre-post views.
-- =====================================================
alter table vmt.peserta_test_results
  alter column project_gform_id drop not null;

alter table vmt.peserta_test_results
  add column if not exists quiz_attempt_id uuid references vmt.quiz_attempts(id) on delete cascade,
  add column if not exists source text not null default 'gform',
  -- Denormalized so getPesertaTrainingDetail no longer needs project_gforms!inner
  -- (a quiz-sourced row has no gform to join).
  add column if not exists form_type vmt.gform_type;

alter table vmt.peserta_test_results
  add constraint peserta_test_results_source_check
    check (source in ('gform', 'quiz'));

alter table vmt.peserta_test_results
  add constraint peserta_test_results_origin_check
    check (
      (source = 'gform' and project_gform_id is not null)
      or (source = 'quiz' and quiz_attempt_id is not null)
    );

-- Backfill form_type for existing gform-sourced rows.
update vmt.peserta_test_results r
set form_type = g.form_type
from vmt.project_gforms g
where r.project_gform_id = g.id and r.form_type is null;

create index if not exists idx_test_results_quiz_attempt
  on vmt.peserta_test_results(quiz_attempt_id);

-- =====================================================
-- RLS — writes go through server actions / route handlers using the service
-- role (bypasses RLS). Authenticated SELECT policies let the admin tab read
-- via the cookie-scoped client. Anonymous public flows read/write only through
-- the trusted server context, so no anon policies are defined (RLS denies them
-- by default even though schema grants are permissive).
-- =====================================================
alter table vmt.quizzes enable row level security;
alter table vmt.quiz_questions enable row level security;
alter table vmt.quiz_options enable row level security;
alter table vmt.quiz_attempts enable row level security;
alter table vmt.quiz_answers enable row level security;

create policy read_quizzes on vmt.quizzes
  for select to authenticated
  using (vmt.is_superadmin() or project_id in (select vmt.auth_user_projects()));

create policy read_quiz_questions on vmt.quiz_questions
  for select to authenticated
  using (
    vmt.is_superadmin()
    or quiz_id in (
      select q.id from vmt.quizzes q
      where q.project_id in (select vmt.auth_user_projects())
    )
  );

create policy read_quiz_options on vmt.quiz_options
  for select to authenticated
  using (
    vmt.is_superadmin()
    or question_id in (
      select qq.id from vmt.quiz_questions qq
      join vmt.quizzes q on q.id = qq.quiz_id
      where q.project_id in (select vmt.auth_user_projects())
    )
  );

create policy read_quiz_attempts on vmt.quiz_attempts
  for select to authenticated
  using (
    vmt.is_superadmin()
    or quiz_id in (
      select q.id from vmt.quizzes q
      where q.project_id in (select vmt.auth_user_projects())
    )
  );

create policy read_quiz_answers on vmt.quiz_answers
  for select to authenticated
  using (
    vmt.is_superadmin()
    or attempt_id in (
      select a.id from vmt.quiz_attempts a
      join vmt.quizzes q on q.id = a.quiz_id
      where q.project_id in (select vmt.auth_user_projects())
    )
  );
