-- Extra logo slots untuk project — biasanya untuk sertifikat
-- (selain logo organisasi mitra). Misal program BAKTI Komdigi punya
-- logo Komdigi + logo BAKTI Foundation + logo partner.
ALTER TABLE vmt.projects
  ADD COLUMN IF NOT EXISTS extra_logos jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Struktur: [{ "path": "logos/xxx.png", "label": "Komdigi" }, ...]
-- "path" mengacu ke object di bucket vmt-evidence untuk reuse RLS yang ada.

DROP VIEW IF EXISTS public.vmt_projects CASCADE;
CREATE VIEW public.vmt_projects AS SELECT * FROM vmt.projects;
GRANT SELECT ON public.vmt_projects TO anon, authenticated;
