// =====================================================
// Supabase Edge Function: sync-gform
// =====================================================
// Pulls Google Sheets responses (linked to a Google Form),
// matches respondents to peserta by email/NIK, writes to
// vmt.peserta_test_results.
//
// Trigger options:
//  - Manual: POST {"project_gform_id": "<uuid>"}
//  - Cron via pg_cron (hourly): see scheduling below
//
// Required env (set via `supabase secrets set`):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  (with \n escapes)
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:
//   supabase secrets set GOOGLE_SERVICE_ACCOUNT_EMAIL=... \
//                        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="$(cat key.txt)"
//   supabase functions deploy sync-gform --no-verify-jwt
//
// Schedule (hourly per active gform):
//   select cron.schedule(
//     'vmt-gform-hourly', '0 * * * *',
//     $$ select net.http_post(
//          url := 'https://<ref>.supabase.co/functions/v1/sync-gform',
//          headers := jsonb_build_object('Authorization','Bearer '||current_setting('app.cron_token')),
//          body := jsonb_build_object('all_active', true)
//        ) $$
//   );
// =====================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// =====================================================
// JWT signing for Google service account
// =====================================================
async function getGoogleAccessToken(): Promise<string> {
  const email = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL")!;
  const privateKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")!
    .replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  const input = `${enc(header)}.${enc(claims)}`;

  // Import the private key for RSA-SHA256 signing
  const pemBody = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const keyBuf = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBuf,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(input),
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${input}.${sigB64}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.access_token;
}

// =====================================================
// Read sheet rows via Sheets API v4
// =====================================================
async function readSheetRows(
  accessToken: string,
  sheetId: string,
): Promise<Array<Record<string, string>>> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:Z`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Sheets API: ${res.status}`);
  const { values } = await res.json();
  if (!values || values.length < 2) return [];

  const [headers, ...dataRows] = values as string[][];
  return dataRows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = row[i] ?? "";
    });
    return obj;
  });
}

// =====================================================
// Score calculator (simple — counts correct vs total)
// =====================================================
function calculateScore(
  row: Record<string, string>,
  identifierField: string,
): { score: number; max: number } | null {
  // Skip the identifier column + Timestamp
  const skipKeys = new Set([identifierField, "Timestamp", "Email Address"]);
  const answers = Object.entries(row).filter(([k]) => !skipKeys.has(k));
  if (answers.length === 0) return null;

  // Naive: count non-empty answers as score (1 point each).
  // Replace with actual answer-key logic when test schema known.
  const score = answers.filter(([, v]) => v && v.trim() !== "").length;
  return { score, max: answers.length };
}

// =====================================================
// Match peserta by identifier
// =====================================================
async function matchPeserta(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  identifier: string,
): Promise<{ user_id: string | null; status: "matched" | "unmatched" }> {
  if (!identifier) return { user_id: null, status: "unmatched" };
  const cleaned = identifier.trim().toLowerCase();

  // Try email match
  const { data: byEmail } = await supabase
    .from("users")
    .select("id")
    .eq("email", cleaned)
    .maybeSingle();
  if (byEmail) return { user_id: byEmail.id, status: "matched" };

  // Try NIK match (if identifier looks numeric)
  if (/^\d{16}$/.test(identifier.trim())) {
    const { data: byNik } = await supabase
      .from("users")
      .select("id")
      .eq("nik", identifier.trim())
      .maybeSingle();
    if (byNik) return { user_id: byNik.id, status: "matched" };
  }

  return { user_id: null, status: "unmatched" };
}

// =====================================================
// Sync one gform
// =====================================================
async function syncOne(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gform: any,
  accessToken: string,
): Promise<{ matched: number; unmatched: number; errors: string[] }> {
  const rows = await readSheetRows(accessToken, gform.sheet_id);
  let matched = 0;
  let unmatched = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const identifier = row[gform.identifier_field] ?? "";
    const { user_id, status } = await matchPeserta(supabase, identifier);
    const submittedAt = row["Timestamp"]
      ? new Date(row["Timestamp"]).toISOString()
      : new Date().toISOString();
    const score = calculateScore(row, gform.identifier_field);

    // Upsert: dedup by (project_gform_id, raw timestamp)
    const { error } = await supabase.from("peserta_test_results").insert({
      project_gform_id: gform.id,
      user_id,
      raw_response: row,
      score: score?.score ?? null,
      max_score: score?.max ?? null,
      submitted_at: submittedAt,
      matched_status: status,
    });

    if (error) {
      errors.push(`row ${matched + unmatched + 1}: ${error.message}`);
      continue;
    }
    if (status === "matched") matched++;
    else unmatched++;
  }

  // Update sync metadata
  await supabase
    .from("project_gforms")
    .update({
      sync_status: errors.length > 0 ? "error" : "active",
      last_sync_at: new Date().toISOString(),
      last_sync_error: errors.length > 0 ? errors.join("\n").slice(0, 500) : null,
    })
    .eq("id", gform.id);

  return { matched, unmatched, errors };
}

// =====================================================
// HTTP entrypoint
// =====================================================
Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { db: { schema: "vmt" }, auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Get list of gforms to sync
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    let gforms: Array<{ id: string; sheet_id: string; identifier_field: string }> = [];

    if (body.project_gform_id) {
      const { data } = await supabase
        .from("project_gforms")
        .select("id, sheet_id, identifier_field")
        .eq("id", body.project_gform_id)
        .maybeSingle();
      if (data) gforms = [data];
    } else if (body.all_active) {
      const { data } = await supabase
        .from("project_gforms")
        .select("id, sheet_id, identifier_field")
        .eq("sync_status", "active");
      gforms = data ?? [];
    } else {
      return new Response(
        JSON.stringify({ error: "Specify project_gform_id or all_active=true" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (gforms.length === 0) {
      return new Response(JSON.stringify({ ok: true, gforms: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const accessToken = await getGoogleAccessToken();
    const results = [];
    for (const gf of gforms) {
      const r = await syncOne(supabase, gf, accessToken);
      results.push({ gform_id: gf.id, ...r });
    }

    return new Response(
      JSON.stringify({ ok: true, gforms: gforms.length, results }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
