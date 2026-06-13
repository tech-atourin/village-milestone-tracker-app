-- =====================================================
-- VMT Cron Setup — RUN MANUALLY in Supabase SQL Editor
-- =====================================================
-- Why manual? Service-role JWT is sensitive; we don't want
-- it flowing through external automation (Claude/CI/etc).
-- The classifier blocks any tool that would write the JWT
-- to persistent DB state. Paste your own copy here.
--
-- Steps:
--   1. Replace <SERVICE_ROLE_JWT> below with the value
--      from `.env.local` (SUPABASE_SERVICE_ROLE_KEY).
--   2. Open Supabase Dashboard → SQL Editor → paste & run.
--   3. Verify with: SELECT jobname, schedule FROM cron.job
--                   WHERE jobname LIKE 'vmt-%';
-- =====================================================

-- 1) Store service-role JWT in Vault (one-time)
SELECT vault.create_secret(
  '<SERVICE_ROLE_JWT>',
  'vmt_cron_service_role',
  'Used by VMT cron jobs to invoke edge functions'
);

-- 2) Schedule sync-gform — every 30 minutes, sync all active gforms
SELECT cron.schedule(
  'vmt-sync-gform',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://wpsnkfyzacilbjsdjzdi.supabase.co/functions/v1/sync-gform',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'vmt_cron_service_role'
      )
    ),
    body := '{"all_active": true}'::jsonb
  );
  $$
);

-- 3) Schedule stagnation-check — daily 00:00 UTC (07:00 WIB)
SELECT cron.schedule(
  'vmt-stagnation-check',
  '0 0 * * *',
  $$
  select net.http_post(
    url := 'https://wpsnkfyzacilbjsdjzdi.supabase.co/functions/v1/stagnation-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'vmt_cron_service_role'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 4) Verify
SELECT jobname, schedule FROM cron.job WHERE jobname LIKE 'vmt-%';

-- =====================================================
-- Edge Function secrets (Google Service Account)
-- =====================================================
-- These are env vars, NOT DB state. Set via CLI:
--   cd /Volumes/My\ Work/Claude/App\ Project/milestone-tracker-app
--   supabase login
--   supabase link --project-ref wpsnkfyzacilbjsdjzdi
--   supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL="village-milestone-tracker@v2-web.iam.gserviceaccount.com"
--   supabase secrets set GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="$(cat app/vmt-service-account.json | jq -r .private_key)"
-- =====================================================

-- =====================================================
-- To unschedule (if needed)
-- =====================================================
-- SELECT cron.unschedule('vmt-sync-gform');
-- SELECT cron.unschedule('vmt-stagnation-check');
