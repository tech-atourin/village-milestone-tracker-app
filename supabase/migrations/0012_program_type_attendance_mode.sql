-- Program type membedakan project pendampingan desa wisata vs pelatihan
-- pelaku pariwisata individu (tidak terkait desa).
ALTER TABLE vmt.projects
  ADD COLUMN IF NOT EXISTS program_type text NOT NULL DEFAULT 'desa_based';

ALTER TABLE vmt.projects
  DROP CONSTRAINT IF EXISTS projects_program_type_check;
ALTER TABLE vmt.projects
  ADD CONSTRAINT projects_program_type_check
  CHECK (program_type IN ('desa_based', 'pelaku_pariwisata'));

-- Attendance mode per peserta: offline ikut full kegiatan + rencana aksi,
-- online hanya pre/post test + materi (tidak ada implementasi action plan).
-- Rapor & sertifikat di-branch oleh field ini.
ALTER TABLE vmt.project_memberships
  ADD COLUMN IF NOT EXISTS attendance_mode text NOT NULL DEFAULT 'offline';

ALTER TABLE vmt.project_memberships
  DROP CONSTRAINT IF EXISTS project_memberships_attendance_mode_check;
ALTER TABLE vmt.project_memberships
  ADD CONSTRAINT project_memberships_attendance_mode_check
  CHECK (attendance_mode IN ('offline', 'online'));

-- Refresh public views agar field baru ikut terekspos ke PostgREST.
DROP VIEW IF EXISTS public.vmt_projects CASCADE;
CREATE VIEW public.vmt_projects AS SELECT * FROM vmt.projects;
GRANT SELECT ON public.vmt_projects TO anon, authenticated;

DROP VIEW IF EXISTS public.vmt_project_memberships CASCADE;
CREATE VIEW public.vmt_project_memberships AS SELECT * FROM vmt.project_memberships;
GRANT SELECT ON public.vmt_project_memberships TO anon, authenticated;
