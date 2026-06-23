-- Sessions dan action plans untuk program tipe pelaku_pariwisata (non desa)
-- diikat ke project saja, tanpa project_desa. Kolom project_desa_id dibuat
-- nullable supaya valid untuk kedua jenis program.
ALTER TABLE vmt.pendampingan_sessions ALTER COLUMN project_desa_id DROP NOT NULL;
ALTER TABLE vmt.desa_action_plans ALTER COLUMN project_desa_id DROP NOT NULL;

DROP VIEW IF EXISTS public.vmt_pendampingan_sessions CASCADE;
CREATE VIEW public.vmt_pendampingan_sessions AS SELECT * FROM vmt.pendampingan_sessions;
GRANT SELECT ON public.vmt_pendampingan_sessions TO anon, authenticated;

DROP VIEW IF EXISTS public.vmt_desa_action_plans CASCADE;
CREATE VIEW public.vmt_desa_action_plans AS SELECT * FROM vmt.desa_action_plans;
GRANT SELECT ON public.vmt_desa_action_plans TO anon, authenticated;
