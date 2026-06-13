-- =====================================================
-- Village Milestone Tracker — Initial Schema (v0.1)
-- =====================================================
-- Multi-tenant via Row Level Security.
-- Lives in dedicated schema `vmt` so this platform can
-- coexist with other Atourin platforms in the same project.
--
-- Apply: `supabase db push` (after `supabase link`)
-- Then expose vmt via Dashboard → API → Exposed schemas.
-- =====================================================

create schema if not exists vmt;

-- Make every unqualified identifier in this file resolve in vmt.
-- auth.* still needs explicit `auth.` prefix.
set search_path = vmt, public;

-- gen_random_uuid() is built into Postgres 13+, no extension needed.

-- =====================================================
-- ENUMS
-- =====================================================

create type org_type as enum ('atourin', 'mitra');

create type global_role as enum ('superadmin', 'mitra_admin', 'peserta', 'narasumber');

create type project_role as enum ('superadmin', 'mitra_admin', 'peserta', 'pendamping', 'narasumber');

create type project_status as enum ('draft', 'active', 'completed', 'archived');

create type membership_status as enum ('pending', 'active', 'removed');

create type tier as enum ('rintisan', 'berkembang', 'maju', 'mandiri', 'unclassified');

create type checklist_status as enum ('not_started', 'submitted', 'approved', 'rejected');

create type topik_status as enum ('not_started', 'in_progress', 'completed', 'needs_revision');

create type file_type as enum ('image', 'video', 'document', 'audio');

create type evidence_tag_type as enum ('checklist_progress', 'national_criteria_progress');

create type gform_type as enum ('pre_test', 'post_test', 'survey_kepuasan', 'survey_lainnya');

create type sync_status as enum ('pending', 'active', 'error');

create type test_match_status as enum ('matched', 'unmatched', 'ambiguous');

create type notification_channel as enum ('in_app', 'email', 'whatsapp');

create type notification_status as enum ('pending', 'sent', 'failed');

create type feedback_target_type as enum ('checklist_progress', 'evidence', 'desa_baseline', 'other');

create type feedback_visibility as enum ('internal_atourin', 'peserta', 'mitra', 'public');

create type criteria_progress_status as enum ('not_started', 'submitted', 'verified', 'rejected');

create type ai_insight_type as enum ('summary', 'recommendation', 'stagnation_flag', 'evidence_review');

create type ai_target_type as enum ('project_desa', 'project', 'peserta');

-- =====================================================
-- IDENTITY & TENANCY
-- =====================================================

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type org_type not null,
  logo_url text,
  brand_color_primary text,
  brand_color_secondary text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique,
  email_artificial boolean not null default false,
  phone text,
  nik text,
  gender text check (gender in ('L', 'P')),
  birthdate date,
  address text,
  organization_id uuid references organizations(id),
  global_role global_role not null default 'peserta',
  avatar_url text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  deleted_at timestamptz
);

create index idx_users_org on users(organization_id);
create index idx_users_phone on users(phone);
create index idx_users_nik on users(nik);

-- =====================================================
-- PROJECT TEMPLATES
-- =====================================================

create table project_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  default_modules jsonb not null default '{
    "desa_baseline": true,
    "topik_pendampingan": true,
    "capacity_building": true,
    "klasifikasi_nasional": false,
    "public_dashboard": false
  }'::jsonb,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table template_topik (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references project_templates(id) on delete cascade,
  name text not null,
  description text,
  sort_order int not null default 0
);

create table template_checklist_item (
  id uuid primary key default gen_random_uuid(),
  template_topik_id uuid not null references template_topik(id) on delete cascade,
  title text not null,
  description text,
  reference_url text,
  required boolean not null default true,
  sort_order int not null default 0
);

-- =====================================================
-- PROJECTS
-- =====================================================

create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  template_id uuid references project_templates(id),
  name text not null,
  description text,
  period_start date,
  period_end date,
  status project_status not null default 'draft',
  enabled_modules jsonb not null default '{}'::jsonb,
  public_dashboard_slug text unique,
  public_dashboard_enabled boolean not null default false,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  deleted_at timestamptz
);

create index idx_projects_org on projects(organization_id);
create index idx_projects_status on projects(status);

create table project_memberships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role project_role not null,
  desa_id uuid, -- FK added below after desa table
  invited_by uuid references users(id),
  invited_at timestamptz not null default now(),
  status membership_status not null default 'active',
  unique (project_id, user_id, role)
);

create index idx_memberships_user on project_memberships(user_id, status);
create index idx_memberships_project on project_memberships(project_id, status);

-- =====================================================
-- DESA & BASELINE
-- =====================================================

create table desa (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  desa_kelurahan text,
  kecamatan text,
  kabupaten text,
  provinsi text,
  lat numeric(10, 7),
  lng numeric(10, 7),
  current_classification tier not null default 'unclassified',
  classification_updated_at timestamptz,
  jadesta_id text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_desa_provinsi on desa(provinsi);
create index idx_desa_name on desa(name);

-- Add FK for project_memberships.desa_id now that desa exists
alter table project_memberships
  add constraint fk_memberships_desa
  foreign key (desa_id) references desa(id);

create table project_desa (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  desa_id uuid not null references desa(id),
  classification_at_start tier,
  classification_target tier,
  coordinator_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  unique (project_id, desa_id)
);

create index idx_project_desa_project on project_desa(project_id);

create table baseline_form_schemas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  version text not null default '1.0.0',
  fields jsonb not null,
  created_at timestamptz not null default now()
);

create table desa_baseline_data (
  id uuid primary key default gen_random_uuid(),
  project_desa_id uuid not null references project_desa(id) on delete cascade,
  schema_version text not null,
  data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  submitted_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- TOPIK PENDAMPINGAN (Sistem A)
-- =====================================================

create table project_topik (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  description text,
  source_template_topik_id uuid references template_topik(id),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_project_topik_project on project_topik(project_id);

create table project_checklist_item (
  id uuid primary key default gen_random_uuid(),
  project_topik_id uuid not null references project_topik(id) on delete cascade,
  title text not null,
  description text,
  reference_url text,
  required boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_checklist_item_topik on project_checklist_item(project_topik_id);

create table desa_topik_instance (
  id uuid primary key default gen_random_uuid(),
  project_desa_id uuid not null references project_desa(id) on delete cascade,
  project_topik_id uuid not null references project_topik(id) on delete cascade,
  status topik_status not null default 'not_started',
  completion_percent numeric(5, 2) not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  unique (project_desa_id, project_topik_id)
);

create index idx_desa_topik_desa on desa_topik_instance(project_desa_id);

create table checklist_progress (
  id uuid primary key default gen_random_uuid(),
  desa_topik_instance_id uuid not null references desa_topik_instance(id) on delete cascade,
  project_checklist_item_id uuid not null references project_checklist_item(id) on delete cascade,
  status checklist_status not null default 'not_started',
  submitted_by uuid references users(id),
  submitted_at timestamptz,
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  review_note text,
  unique (desa_topik_instance_id, project_checklist_item_id)
);

create index idx_progress_instance on checklist_progress(desa_topik_instance_id);
create index idx_progress_status on checklist_progress(status);

-- =====================================================
-- EVIDENCE (reusable)
-- =====================================================

create table evidence_files (
  id uuid primary key default gen_random_uuid(),
  project_desa_id uuid not null references project_desa(id) on delete cascade,
  uploaded_by uuid not null references users(id),
  file_url text not null,
  file_type file_type not null,
  file_size_bytes bigint,
  original_filename text,
  caption text,
  geo_lat numeric(10, 7),
  geo_lng numeric(10, 7),
  captured_at timestamptz,
  uploaded_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_evidence_desa on evidence_files(project_desa_id);
create index idx_evidence_uploader on evidence_files(uploaded_by);

create table evidence_tags (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references evidence_files(id) on delete cascade,
  tag_type evidence_tag_type not null,
  tag_target_id uuid not null,
  tagged_by uuid references users(id),
  tagged_at timestamptz not null default now(),
  unique (evidence_id, tag_type, tag_target_id)
);

create index idx_tags_target on evidence_tags(tag_type, tag_target_id);
create index idx_tags_evidence on evidence_tags(evidence_id);

-- =====================================================
-- KLASIFIKASI DESA (Sistem B — Stub)
-- =====================================================

create table national_criteria_master (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  effective_from date,
  effective_to date,
  source_url text,
  created_at timestamptz not null default now()
);

create table national_criteria_item (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references national_criteria_master(id) on delete cascade,
  tier tier not null,
  category text not null,
  title text not null,
  description text,
  weight numeric(8, 2) not null default 1,
  required boolean not null default false,
  sort_order int not null default 0
);

create index idx_criteria_master on national_criteria_item(master_id, tier);

create table desa_classification (
  id uuid primary key default gen_random_uuid(),
  desa_id uuid not null references desa(id) on delete cascade,
  tier tier not null,
  score numeric(8, 2),
  criteria_version text,
  evaluated_at timestamptz not null default now(),
  evaluated_by uuid references users(id),
  auto_calculated boolean not null default false,
  note text
);

create index idx_classification_desa on desa_classification(desa_id, evaluated_at desc);

create table national_criteria_progress (
  id uuid primary key default gen_random_uuid(),
  desa_id uuid not null references desa(id) on delete cascade,
  criteria_item_id uuid not null references national_criteria_item(id) on delete cascade,
  status criteria_progress_status not null default 'not_started',
  submitted_by uuid references users(id),
  submitted_at timestamptz,
  verified_by uuid references users(id),
  verified_at timestamptz,
  unique (desa_id, criteria_item_id)
);

create index idx_criteria_progress_desa on national_criteria_progress(desa_id);

-- =====================================================
-- CAPACITY BUILDING (Layer 3)
-- =====================================================

create table project_gforms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  form_type gform_type not null,
  form_label text,
  gform_id text not null,
  sheet_id text not null,
  identifier_field text not null,
  sync_status sync_status not null default 'pending',
  last_sync_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now()
);

create table peserta_test_results (
  id uuid primary key default gen_random_uuid(),
  project_gform_id uuid not null references project_gforms(id) on delete cascade,
  user_id uuid references users(id),
  raw_response jsonb not null,
  score numeric(8, 2),
  max_score numeric(8, 2),
  submitted_at timestamptz not null,
  matched_status test_match_status not null default 'unmatched',
  created_at timestamptz not null default now()
);

create index idx_test_results_user on peserta_test_results(user_id);
create index idx_test_results_gform on peserta_test_results(project_gform_id);

create table rapor_peserta (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  pre_test_score numeric(8, 2),
  post_test_score numeric(8, 2),
  improvement_percent numeric(6, 2),
  survey_kepuasan jsonb,
  attendance numeric(5, 2),
  generated_at timestamptz not null default now(),
  pdf_url text,
  unique (user_id, project_id)
);

-- =====================================================
-- FEEDBACK, NOTIFICATION, AUDIT
-- =====================================================

create table feedback (
  id uuid primary key default gen_random_uuid(),
  target_type feedback_target_type not null,
  target_id uuid not null,
  author_id uuid not null references users(id),
  body text not null,
  visibility feedback_visibility not null default 'peserta',
  created_at timestamptz not null default now()
);

create index idx_feedback_target on feedback(target_type, target_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  channel notification_channel not null,
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status notification_status not null default 'pending',
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id, status);
create index idx_notifications_scheduled on notifications(scheduled_at, status);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_audit_entity on audit_log(entity_type, entity_id);
create index idx_audit_actor on audit_log(actor_id, created_at desc);

-- =====================================================
-- AI INSIGHTS
-- =====================================================

create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  target_type ai_target_type not null,
  target_id uuid not null,
  insight_type ai_insight_type not null,
  content jsonb not null,
  model text not null,
  input_tokens int,
  output_tokens int,
  generated_at timestamptz not null default now(),
  valid_until timestamptz,
  triggered_by uuid references users(id)
);

create index idx_ai_insights_target on ai_insights(target_type, target_id, insight_type, generated_at desc);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Helper: user's accessible project IDs
create or replace function auth_user_projects()
returns setof uuid
language sql
security definer
stable
set search_path = vmt, public, pg_temp
as $$
  select project_id
  from project_memberships
  where user_id = auth.uid() and status = 'active';
$$;

-- Helper: is current user superadmin?
create or replace function is_superadmin()
returns boolean
language sql
security definer
stable
set search_path = vmt, public, pg_temp
as $$
  select coalesce(
    (select global_role = 'superadmin' from users where id = auth.uid()),
    false
  );
$$;

-- Enable RLS
alter table organizations enable row level security;
alter table users enable row level security;
alter table project_templates enable row level security;
alter table template_topik enable row level security;
alter table template_checklist_item enable row level security;
alter table projects enable row level security;
alter table project_memberships enable row level security;
alter table desa enable row level security;
alter table project_desa enable row level security;
alter table baseline_form_schemas enable row level security;
alter table desa_baseline_data enable row level security;
alter table project_topik enable row level security;
alter table project_checklist_item enable row level security;
alter table desa_topik_instance enable row level security;
alter table checklist_progress enable row level security;
alter table evidence_files enable row level security;
alter table evidence_tags enable row level security;
alter table national_criteria_master enable row level security;
alter table national_criteria_item enable row level security;
alter table desa_classification enable row level security;
alter table national_criteria_progress enable row level security;
alter table project_gforms enable row level security;
alter table peserta_test_results enable row level security;
alter table rapor_peserta enable row level security;
alter table feedback enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;
alter table ai_insights enable row level security;

-- Superadmin full access policies
create policy "superadmin_all_orgs" on organizations
  for all to authenticated using (is_superadmin()) with check (is_superadmin());

create policy "superadmin_all_users" on users
  for all to authenticated using (is_superadmin()) with check (is_superadmin());

create policy "users_read_self" on users
  for select to authenticated using (id = auth.uid());

create policy "users_update_self" on users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "superadmin_all_projects" on projects
  for all to authenticated using (is_superadmin()) with check (is_superadmin());

create policy "members_read_projects" on projects
  for select to authenticated using (
    id in (select auth_user_projects())
  );

create policy "members_read_memberships" on project_memberships
  for select to authenticated using (
    is_superadmin() or
    user_id = auth.uid() or
    project_id in (select auth_user_projects())
  );

create policy "superadmin_write_memberships" on project_memberships
  for insert to authenticated with check (is_superadmin());

create policy "superadmin_update_memberships" on project_memberships
  for update to authenticated using (is_superadmin()) with check (is_superadmin());

-- Projects scope helper for content tables
create policy "scope_project_desa" on project_desa
  for select to authenticated using (
    is_superadmin() or project_id in (select auth_user_projects())
  );

create policy "scope_project_topik" on project_topik
  for select to authenticated using (
    is_superadmin() or project_id in (select auth_user_projects())
  );

create policy "scope_checklist_item" on project_checklist_item
  for select to authenticated using (
    is_superadmin() or project_topik_id in (
      select id from project_topik where project_id in (select auth_user_projects())
    )
  );

create policy "scope_desa_topik_instance" on desa_topik_instance
  for select to authenticated using (
    is_superadmin() or project_desa_id in (
      select id from project_desa where project_id in (select auth_user_projects())
    )
  );

create policy "scope_checklist_progress" on checklist_progress
  for select to authenticated using (
    is_superadmin() or desa_topik_instance_id in (
      select id from desa_topik_instance where project_desa_id in (
        select id from project_desa where project_id in (select auth_user_projects())
      )
    )
  );

create policy "scope_evidence" on evidence_files
  for select to authenticated using (
    is_superadmin() or project_desa_id in (
      select id from project_desa where project_id in (select auth_user_projects())
    )
  );

create policy "scope_evidence_tags" on evidence_tags
  for select to authenticated using (
    is_superadmin() or evidence_id in (
      select id from evidence_files where project_desa_id in (
        select id from project_desa where project_id in (select auth_user_projects())
      )
    )
  );

-- Read-only public reference data
create policy "read_public_desa" on desa
  for select to authenticated using (true);

create policy "read_templates" on project_templates
  for select to authenticated using (true);

create policy "read_template_topik" on template_topik
  for select to authenticated using (true);

create policy "read_template_checklist" on template_checklist_item
  for select to authenticated using (true);

-- NOTE: Write policies untuk peserta/mitra perlu ditambahkan
-- berdasarkan role specific actions (peserta submit checklist,
-- atourin approve, dst). Akan ditambah di migration berikutnya
-- sesuai modul yang dibangun.

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update completion_percent saat checklist_progress berubah
create or replace function update_topik_completion()
returns trigger
language plpgsql
set search_path = vmt, public, pg_temp
as $$
declare
  v_total int;
  v_approved int;
  v_pct numeric;
  v_instance_id uuid;
begin
  v_instance_id := coalesce(new.desa_topik_instance_id, old.desa_topik_instance_id);

  select count(*) into v_total
  from checklist_progress
  where desa_topik_instance_id = v_instance_id;

  select count(*) into v_approved
  from checklist_progress
  where desa_topik_instance_id = v_instance_id and status = 'approved';

  if v_total > 0 then
    v_pct := (v_approved::numeric / v_total) * 100;
  else
    v_pct := 0;
  end if;

  update desa_topik_instance
  set completion_percent = v_pct,
      status = case
        when v_pct = 100 then 'completed'::topik_status
        when v_pct > 0 then 'in_progress'::topik_status
        else 'not_started'::topik_status
      end,
      completed_at = case when v_pct = 100 then now() else null end
  where id = v_instance_id;

  return null;
end;
$$;

create trigger trg_update_topik_completion
after insert or update or delete on checklist_progress
for each row execute function update_topik_completion();

-- Auto-update timestamps
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = vmt, public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_baseline_updated
before update on desa_baseline_data
for each row execute function set_updated_at();

-- =====================================================
-- POSTGREST: grant API access to vmt schema
-- =====================================================
-- These grants allow Supabase's PostgREST to expose vmt.
-- You ALSO need to add `vmt` under Dashboard → Settings → API
-- → Exposed schemas. Both grants and the dashboard setting
-- are required.

grant usage on schema vmt to anon, authenticated, service_role;
grant all on all tables in schema vmt to anon, authenticated, service_role;
grant all on all sequences in schema vmt to anon, authenticated, service_role;
grant all on all functions in schema vmt to anon, authenticated, service_role;

alter default privileges in schema vmt
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema vmt
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema vmt
  grant all on functions to anon, authenticated, service_role;
