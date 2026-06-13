-- =====================================================
-- Seed test users — RUN AFTER creating auth accounts.
-- =====================================================
-- The auth.users rows must exist first (via Supabase
-- Dashboard → Authentication → Users → Add user, or via
-- the admin API). Then this file inserts the vmt.users
-- profile rows with the right global_role.
--
-- Replace the UUIDs and emails below with real ones from
-- your Supabase Auth dashboard before running.
-- =====================================================

set search_path = vmt, public;

-- Superadmin
-- insert into users (id, full_name, email, global_role, organization_id)
-- values (
--   '<auth-user-uuid>',
--   'Rivo (Atourin Admin)',
--   'rivo@atourin.id',
--   'superadmin',
--   '00000000-0000-0000-0000-000000000001'   -- Atourin org from seed.sql
-- )
-- on conflict (id) do update set global_role = excluded.global_role;
