// =====================================================
// Supabase Edge Function: stagnation-check
// =====================================================
// Daily scan of project_desa with no activity > 30 days.
// For each match, write:
//   - ai_insights (insight_type='stagnation_flag')
//   - notifications (in_app + email/WA) to coordinator + superadmins
//
// Schedule (one-time, via Supabase CLI):
//   supabase functions deploy stagnation-check --no-verify-jwt
//   psql $DATABASE_URL -c \
//     "select cron.schedule(
//       'vmt-stagnation-daily', '0 8 * * *',
//       \$\$select net.http_post(
//         url := 'https://wpsnkfyzacilbjsdjzdi.supabase.co/functions/v1/stagnation-check',
//         headers := jsonb_build_object('Authorization','Bearer '||current_setting('app.cron_token')),
//         body := '{}'::jsonb
//       )\$\$
//     );"
// =====================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const STAGNANT_DAYS = 30;

Deno.serve(async (_req) => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    db: { schema: "vmt" },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: stagnant, error } = await supabase.rpc("detect_stagnant_desa", {
    p_days: STAGNANT_DAYS,
  });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let written = 0;
  for (const row of (stagnant ?? []) as Array<{
    project_desa_id: string;
    project_id: string;
    project_name: string;
    desa_id: string;
    desa_name: string;
    last_submission_at: string | null;
    days_idle: number;
    coordinator_user_id: string | null;
  }>) {
    // Persist as ai_insight (so dashboard can surface it)
    await supabase.from("ai_insights").insert({
      target_type: "project_desa",
      target_id: row.project_desa_id,
      insight_type: "stagnation_flag",
      content: {
        days_idle: row.days_idle,
        last_submission_at: row.last_submission_at,
        project_name: row.project_name,
        desa_name: row.desa_name,
      },
      model: "rule-based",
      valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    // Notify coordinator
    if (row.coordinator_user_id) {
      await supabase.from("notifications").insert({
        user_id: row.coordinator_user_id,
        channel: "email",
        template_key: "stagnation_alert",
        payload: {
          _rendered: {
            subject: `[Stagnan] ${row.desa_name} sudah ${row.days_idle} hari tidak ada submission`,
            inAppText: `Desa ${row.desa_name} di project ${row.project_name} sudah ${row.days_idle} hari tidak aktif.`,
            html: `<p>Desa <b>${row.desa_name}</b> di project <b>${row.project_name}</b> sudah ${row.days_idle} hari tidak ada submission baru. Pertimbangkan intervensi.</p>`,
          },
        },
        status: "pending",
      });
    }

    // Notify all superadmins
    const { data: superadmins } = await supabase
      .from("users")
      .select("id")
      .eq("global_role", "superadmin");
    for (const sa of (superadmins ?? []) as Array<{ id: string }>) {
      await supabase.from("notifications").insert({
        user_id: sa.id,
        channel: "in_app",
        template_key: "stagnation_alert",
        payload: {
          _rendered: {
            subject: `[Stagnan] ${row.desa_name}`,
            inAppText: `${row.desa_name} (${row.project_name}) — ${row.days_idle} hari tidak aktif.`,
            html: "",
          },
        },
        status: "pending",
      });
    }
    written++;
  }

  return new Response(
    JSON.stringify({
      ok: true,
      stagnant_count: stagnant?.length ?? 0,
      notifications_written: written,
      cutoff_days: STAGNANT_DAYS,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
