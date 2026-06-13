"use server";

import * as XLSX from "xlsx";
import nodemailer from "nodemailer";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/rbac";
import {
  parseBulkRows,
  type BulkRowResult,
} from "@/lib/excel/bulk-import";

// =====================================================
// Generate Excel template
// =====================================================
export async function generateTemplateBase64(): Promise<string> {
  await requireRole("superadmin");

  const headers = [
    "full_name",
    "email",
    "phone",
    "nik",
    "gender",
    "birthdate",
    "desa_name",
    "role",
  ];
  const sample = [
    "Eko Haryanto",
    "eko@example.com",
    "081234567890",
    "3501010101010001",
    "L",
    "12/05/1985",
    "Wanurejo",
    "peserta",
  ];
  const guidance = [
    "Wajib diisi: nama lengkap",
    "Email ATAU HP wajib (boleh keduanya)",
    "Format 62xxx atau 08xxx — sistem auto-normalize",
    "16 digit, opsional (untuk matching GForm)",
    "L atau P",
    "DD/MM/YYYY atau YYYY-MM-DD, opsional",
    "Nama desa yang sudah terdaftar, atau biarkan kosong untuk peserta non-desa",
    "peserta | mitra_admin | narasumber — default peserta",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sample, guidance]);
  ws["!cols"] = headers.map(() => ({ wch: 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Peserta");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return buf.toString("base64");
}

// =====================================================
// Parse uploaded file (base64 → rows + validation)
// =====================================================
const parseInputSchema = z.object({
  base64: z.string().min(1),
});

export type ParseResult = {
  rows: BulkRowResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    new_users: number;
    existing_users: number;
  };
  duplicates: Array<{
    rowNumber: number;
    existing_user_id: string;
    match_on: "email" | "phone" | "nik";
  }>;
};

export async function parseBulkFile(input: {
  base64: string;
}): Promise<ParseResult | { error: string }> {
  await requireRole("superadmin");

  const parsed = parseInputSchema.safeParse(input);
  if (!parsed.success) return { error: "File tidak valid." };

  let rows: Array<Record<string, unknown>> = [];
  try {
    const buf = Buffer.from(parsed.data.base64, "base64");
    const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      blankrows: false,
    }) as Array<Record<string, unknown>>;
  } catch (e) {
    return {
      error:
        "Gagal baca file Excel. Pastikan format .xlsx dan baris pertama berisi header kolom.",
    };
  }

  if (!rows.length) return { error: "File kosong, tidak ada baris data." };

  const results = parseBulkRows(rows);

  // Dedup detection: match against existing vmt.users
  const admin = createAdminClient();
  const emails = results
    .filter((r) => r.ok && r.data?.email)
    .map((r) => r.data!.email as string);
  const phones = results
    .filter((r) => r.ok && r.data?.normalized_phone)
    .map((r) => r.data!.normalized_phone as string);
  const niks = results
    .filter((r) => r.ok && r.data?.nik)
    .map((r) => r.data!.nik as string);

  const duplicates: ParseResult["duplicates"] = [];

  if (emails.length || phones.length || niks.length) {
    const conditions: string[] = [];
    if (emails.length)
      conditions.push(`email.in.(${emails.map((e) => `"${e}"`).join(",")})`);
    if (phones.length)
      conditions.push(`phone.in.(${phones.map((p) => `"${p}"`).join(",")})`);
    if (niks.length)
      conditions.push(`nik.in.(${niks.map((n) => `"${n}"`).join(",")})`);

    const { data: existing } = await admin
      .from("users")
      .select("id, email, phone, nik")
      .or(conditions.join(","));

    const byEmail = new Map<string, string>();
    const byPhone = new Map<string, string>();
    const byNik = new Map<string, string>();
    for (const u of (existing ?? []) as Array<{
      id: string;
      email: string | null;
      phone: string | null;
      nik: string | null;
    }>) {
      if (u.email) byEmail.set(u.email, u.id);
      if (u.phone) byPhone.set(u.phone, u.id);
      if (u.nik) byNik.set(u.nik, u.id);
    }

    for (const r of results) {
      if (!r.ok || !r.data) continue;
      if (r.data.email && byEmail.has(r.data.email)) {
        duplicates.push({
          rowNumber: r.rowNumber,
          existing_user_id: byEmail.get(r.data.email)!,
          match_on: "email",
        });
      } else if (
        r.data.normalized_phone &&
        byPhone.has(r.data.normalized_phone)
      ) {
        duplicates.push({
          rowNumber: r.rowNumber,
          existing_user_id: byPhone.get(r.data.normalized_phone)!,
          match_on: "phone",
        });
      } else if (r.data.nik && byNik.has(r.data.nik)) {
        duplicates.push({
          rowNumber: r.rowNumber,
          existing_user_id: byNik.get(r.data.nik)!,
          match_on: "nik",
        });
      }
    }
  }

  const dupRows = new Set(duplicates.map((d) => d.rowNumber));
  const valid = results.filter((r) => r.ok).length;
  const newUsers = results.filter(
    (r) => r.ok && !dupRows.has(r.rowNumber),
  ).length;
  const existingUsers = dupRows.size;

  return {
    rows: results,
    duplicates,
    summary: {
      total: results.length,
      valid,
      invalid: results.length - valid,
      new_users: newUsers,
      existing_users: existingUsers,
    },
  };
}

// =====================================================
// Commit — create users + memberships + send invites
// =====================================================
const commitSchema = z.object({
  rows: z.array(
    z.object({
      full_name: z.string(),
      email: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      nik: z.string().optional().nullable(),
      gender: z.string().optional().nullable(),
      birthdate: z.string().optional().nullable(),
      desa_name: z.string().optional().nullable(),
      role: z.enum(["peserta", "mitra_admin", "narasumber"]),
    }),
  ),
  project_id: z.string().uuid().optional().nullable(),
  send_invites: z.boolean().default(true),
});

export type CommitInput = z.input<typeof commitSchema>;
export type CommitResult = {
  error?: string;
  created?: number;
  skipped?: number;
  invites_sent?: number;
  invites_failed?: number;
  errors?: string[];
};

export async function commitBulkImport(
  input: CommitInput,
): Promise<CommitResult> {
  await requireRole("superadmin");

  const parsed = commitSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Payload tidak valid." };
  }

  const admin = createAdminClient();
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;
  let invitesSent = 0;
  let invitesFailed = 0;

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser;
  const fromName = process.env.SMTP_FROM_NAME ?? "Atourin Milestone Tracker";
  const transporter =
    smtpUser && smtpPass
      ? nodemailer.createTransport({
          host: process.env.SMTP_HOST ?? "smtp.gmail.com",
          port: Number(process.env.SMTP_PORT ?? 465),
          secure: (process.env.SMTP_SECURE ?? "true") === "true",
          auth: { user: smtpUser, pass: smtpPass },
        })
      : null;
  const appName =
    process.env.NEXT_PUBLIC_APP_NAME ?? "Atourin Milestone Tracker";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  for (const row of parsed.data.rows) {
    // 1. Resolve/normalize email
    let email = row.email?.trim().toLowerCase() || null;
    let emailArtificial = false;
    if (!email) {
      if (!row.nik) {
        skipped++;
        errors.push(
          `${row.full_name}: tidak ada email atau NIK — tidak bisa create auth user.`,
        );
        continue;
      }
      email = `nik+${row.nik}@peserta.atourin.id`;
      emailArtificial = true;
    }

    // 2. Skip duplicates
    const { data: existing } = await admin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      skipped++;
      continue;
    }

    // 3. Create auth user (email-confirmed so they can log in once we set password)
    const { data: authResult, error: authError } =
      await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        // Random password — user resets via "Lupa password"
        password: cryptoRandomPassword(),
        user_metadata: {
          full_name: row.full_name,
          imported: true,
        },
      });

    if (authError || !authResult.user) {
      errors.push(`${row.full_name} (${email}): ${authError?.message ?? "auth create gagal"}`);
      continue;
    }

    // 4. Insert vmt.users row
    const { error: insertError } = await admin.from("users").insert({
      id: authResult.user.id,
      full_name: row.full_name,
      email,
      email_artificial: emailArtificial,
      phone: row.phone || null,
      nik: row.nik || null,
      gender: row.gender || null,
      birthdate: row.birthdate || null,
      global_role: row.role,
    });

    if (insertError) {
      // Roll back auth user to avoid orphan
      await admin.auth.admin.deleteUser(authResult.user.id);
      errors.push(`${row.full_name}: ${insertError.message}`);
      continue;
    }

    created++;

    // 5. Send invite email (best-effort)
    if (parsed.data.send_invites && !emailArtificial && transporter && fromEmail) {
      try {
        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: email,
          subject: `Anda diundang ke ${appName}`,
          html: invitationHtml(row.full_name, appName, appUrl),
        });
        invitesSent++;
      } catch (e) {
        invitesFailed++;
      }
    }
  }

  return {
    created,
    skipped,
    invites_sent: invitesSent,
    invites_failed: invitesFailed,
    errors: errors.slice(0, 20),
  };
}

function cryptoRandomPassword(): string {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString("base64").replace(/[+/=]/g, "_");
}

function invitationHtml(
  fullName: string,
  appName: string,
  appUrl: string,
): string {
  const resetUrl = `${appUrl}/forgot-password`;
  return `
<!doctype html>
<html lang="id">
  <body style="font-family: -apple-system, system-ui, sans-serif; color:#0f172a; max-width:560px; margin:0 auto; padding:24px;">
    <h2 style="color:#047857;">Halo ${escapeHtml(fullName)},</h2>
    <p>Anda telah diundang bergabung dengan <strong>${escapeHtml(appName)}</strong> — platform pendampingan desa wisata Atourin.</p>
    <p>Untuk login pertama kali, silakan klik tombol di bawah untuk set password Anda:</p>
    <p style="margin: 24px 0;">
      <a href="${resetUrl}" style="background:#059669; color:#fff; padding:10px 18px; border-radius:8px; text-decoration:none; font-weight:600;">Set Password</a>
    </p>
    <p style="color:#475569; font-size:13px;">Jika tombol tidak berfungsi, salin URL ini ke browser: ${resetUrl}</p>
    <p style="color:#94a3b8; font-size:12px; margin-top:32px;">Email ini dikirim otomatis. Jika Anda merasa menerima ini secara keliru, abaikan saja.</p>
  </body>
</html>`.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
