import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { createSign, createPrivateKey } from "node:crypto";
import { calcScore } from "./score";

// =====================================================
// Local GForm sync (Next.js server-side)
// =====================================================
// Same logic as the edge function but runs in Node (used
// when admin clicks "Sync now" from /atourin UI). The edge
// function is for scheduled cron.
// =====================================================

function getServiceAccount(): { email: string; privateKey: string } {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "";
  // Accept both literal \n and actual newline forms
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }
  if (!email || !privateKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL/PRIVATE_KEY not configured",
    );
  }
  return { email, privateKey };
}

function b64url(input: Buffer | string): string {
  const b = typeof input === "string" ? Buffer.from(input) : input;
  return b
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getGoogleAccessToken(): Promise<string> {
  const { email, privateKey } = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;

  const key = createPrivateKey({ key: privateKey, format: "pem" });
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const sig = signer.sign(key);
  const jwt = `${signingInput}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token error: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function readSheet(
  token: string,
  sheetId: string,
): Promise<Array<Record<string, string>>> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:Z`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(
      `Sheets read error: ${res.status} - pastikan service account sudah di-share access ke sheet`,
    );
  }
  const { values } = (await res.json()) as { values: string[][] };
  if (!values || values.length < 2) return [];
  const [headers, ...data] = values;
  return data.map((row) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => {
      o[h.trim()] = row[i] ?? "";
    });
    return o;
  });
}

// (calcScore extracted to ./score.ts for testability)

export type SyncReport = {
  matched: number;
  unmatched: number;
  errors: string[];
};

export async function syncGformLocal(
  projectGformId: string,
): Promise<SyncReport & { ok: boolean }> {
  const admin = createAdminClient();
  const { data: gf } = await admin
    .from("project_gforms")
    .select("id, sheet_id, identifier_field, form_type")
    .eq("id", projectGformId)
    .maybeSingle();
  if (!gf) {
    return { ok: false, matched: 0, unmatched: 0, errors: ["GForm not found"] };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg = gf as any;

  let token: string;
  try {
    token = await getGoogleAccessToken();
  } catch (e) {
    return { ok: false, matched: 0, unmatched: 0, errors: [(e as Error).message] };
  }

  let rows: Array<Record<string, string>>;
  try {
    rows = await readSheet(token, cfg.sheet_id);
  } catch (e) {
    return { ok: false, matched: 0, unmatched: 0, errors: [(e as Error).message] };
  }

  let matched = 0;
  let unmatched = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const identifier = (row[cfg.identifier_field] ?? "").trim().toLowerCase();
    let userId: string | null = null;
    let status: "matched" | "unmatched" = "unmatched";

    if (identifier) {
      const { data: byEmail } = await admin
        .from("users")
        .select("id")
        .eq("email", identifier)
        .maybeSingle();
      if (byEmail) {
        userId = (byEmail as { id: string }).id;
        status = "matched";
      } else if (/^\d{16}$/.test(identifier)) {
        const { data: byNik } = await admin
          .from("users")
          .select("id")
          .eq("nik", identifier)
          .maybeSingle();
        if (byNik) {
          userId = (byNik as { id: string }).id;
          status = "matched";
        }
      }
    }

    const score = calcScore(row, cfg.identifier_field);
    const submittedAt = row["Timestamp"]
      ? new Date(row["Timestamp"]).toISOString()
      : new Date().toISOString();

    const { error } = await admin.from("peserta_test_results").insert({
      project_gform_id: cfg.id,
      user_id: userId,
      raw_response: row,
      score: score?.score ?? null,
      max_score: score?.max ?? null,
      submitted_at: submittedAt,
      matched_status: status,
    });
    if (error) errors.push(error.message);
    else if (status === "matched") matched++;
    else unmatched++;
  }

  await admin
    .from("project_gforms")
    .update({
      sync_status: errors.length > 0 ? "error" : "active",
      last_sync_at: new Date().toISOString(),
      last_sync_error: errors.length > 0 ? errors.join("\n").slice(0, 500) : null,
    })
    .eq("id", projectGformId);

  return { ok: errors.length === 0, matched, unmatched, errors };
}
