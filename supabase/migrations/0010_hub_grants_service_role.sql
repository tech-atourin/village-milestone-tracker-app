-- 0010_hub_grants_service_role.sql
-- The Hub schema is co-tenanted (Atourin's master desa wisata DB lives there).
-- vmt's server actions connect with the service-role key to read hub for
-- "Import dari Hub" + hub sync flows. Without explicit SELECT grants,
-- PostgREST silently returns empty for service_role even though the SQL works,
-- so "Cari" returns no results.
--
-- Grant read-only access on the hub tables vmt actually reads. We do not
-- grant INSERT/UPDATE/DELETE on hub - those mutations stay with the Atourin
-- Hub app that owns the data.

GRANT USAGE ON SCHEMA hub TO service_role;

GRANT SELECT ON hub.desa            TO service_role;
GRANT SELECT ON hub.kontak          TO service_role;
GRANT SELECT ON hub.desa_fasilitas  TO service_role;
GRANT SELECT ON hub.fasilitas       TO service_role;
GRANT SELECT ON hub.riwayat_adwi    TO service_role;
GRANT SELECT ON hub.award           TO service_role;
GRANT SELECT ON hub.produk          TO service_role;
GRANT SELECT ON hub.desa_foto       TO service_role;
GRANT SELECT ON hub.event           TO service_role;
