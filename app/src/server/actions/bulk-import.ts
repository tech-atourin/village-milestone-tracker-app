"use server";

import * as XLSX from "xlsx";
import nodemailer from "nodemailer";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/rbac";
import {
  parseBulkRows,
  type BulkRowResult,
} from "@/lib/excel/bulk-import";
import { invitationHtml } from "@/lib/email/invitation-template";

// =====================================================
// Generate Excel template
// =====================================================
async function requireImporter() {
  const u = await getCurrentUser();
  if (!u) throw new Error("Tidak terautentikasi");
  if (u.global_role !== "superadmin" && u.global_role !== "mitra_admin")
    throw new Error("Tidak diizinkan");
  return u;
}

export async function generateTemplateBase64(
  mode: "peserta" | "narasumber" = "peserta",
): Promise<string> {
  await requireImporter();

  const pesertaHeaders = [
    "full_name",
    "email",
    "phone",
    "nik",
    "gender",
    "birthdate",
    "desa_name",
    "role",
  ];
  const pesertaSample = [
    "Eko Haryanto",
    "eko@example.com",
    "081234567890",
    "3501010101010001",
    "L",
    "12/05/1985",
    "Wanurejo",
    "peserta",
  ];
  const pesertaGuidance = [
    "Wajib diisi: nama lengkap",
    "Email ATAU HP wajib (boleh keduanya)",
    "Format 62xxx atau 08xxx - sistem auto-normalize",
    "16 digit, opsional (untuk matching GForm)",
    "L atau P",
    "DD/MM/YYYY atau YYYY-MM-DD, opsional",
    "Nama desa yang sudah terdaftar, atau biarkan kosong untuk peserta non-desa",
    "peserta | mitra_admin | narasumber - default peserta",
  ];

  const narasumberHeaders = [
    "full_name",
    "email",
    "phone",
    "gender",
    "jabatan",
    "instansi",
    "kota",
    "kategori_narasumber",
    "kompetensi",
    "role",
  ];
  const narasumberSample = [
    "Dr. Ratna Hapsari M.Si",
    "ratna@example.com",
    "081234567890",
    "P",
    "Dosen Senior",
    "UGM",
    "Yogyakarta",
    "akademisi",
    "Storytelling & branding desa wisata",
    "narasumber",
  ];
  const narasumberGuidance = [
    "Wajib diisi: nama lengkap",
    "Wajib (untuk login). Tanpa email = profil saja, tidak bisa login.",
    "Format 62xxx atau 08xxx - sistem auto-normalize",
    "L atau P (opsional)",
    "Jabatan kerja saat ini (opsional)",
    "Nama instansi / lembaga (opsional)",
    "Kota domisili (opsional)",
    "praktisi | akademisi | profesional | pns | lainnya",
    "Bidang ahli / topik utama yang dikuasai",
    "Selalu 'narasumber' untuk template ini",
  ];

  const headers = mode === "narasumber" ? narasumberHeaders : pesertaHeaders;
  const sample = mode === "narasumber" ? narasumberSample : pesertaSample;
  const guidance =
    mode === "narasumber" ? narasumberGuidance : pesertaGuidance;
  const sheetName = mode === "narasumber" ? "Narasumber" : "Peserta";

  const ws = XLSX.utils.aoa_to_sheet([headers, sample, guidance]);
  ws["!cols"] = headers.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

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
  await requireImporter();

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
// Commit - create users + memberships + send invites
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
export type ImportedCredential = {
  id: string;
  full_name: string;
  email: string;
  password: string;
};
export type CommitResult = {
  error?: string;
  created?: number;
  skipped?: number;
  attached?: number;
  invites_sent?: number;
  invites_failed?: number;
  errors?: string[];
  credentials?: ImportedCredential[];
};

export async function commitBulkImport(
  input: CommitInput,
): Promise<CommitResult> {
  const parsed = commitSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Payload tidak valid." };
  }

  // Auth: superadmin always; mitra_admin only when importing INTO a project
  // owned by their organization (project-scoped peserta import).
  const actor = await getCurrentUser();
  if (!actor) return { error: "Tidak terautentikasi" };
  const adminGuard = createAdminClient();
  if (actor.global_role !== "superadmin") {
    if (actor.global_role !== "mitra_admin" || !parsed.data.project_id)
      return {
        error: "Hanya superadmin, atau mitra untuk project sendiri, yang bisa bulk import.",
      };
    const { data: proj } = await adminGuard
      .from("projects")
      .select("organization_id")
      .eq("id", parsed.data.project_id)
      .maybeSingle();
    const orgId = (proj as { organization_id: string | null } | null)
      ?.organization_id;
    if (!orgId || orgId !== actor.organization_id)
      return { error: "Project bukan milik organisasi Anda." };
  }

  const admin = createAdminClient();
  const errors: string[] = [];
  let created = 0;
  let skipped = 0;
  let attached = 0;
  let invitesSent = 0;
  let invitesFailed = 0;
  const credentials: ImportedCredential[] = [];

  // Pre-resolve project's desa (name → id) for membership attachment
  const projectId = parsed.data.project_id ?? null;
  const desaByName = new Map<string, string>();
  if (projectId) {
    const { data: pdRows } = await admin
      .from("project_desa")
      .select("desa_id, desa:desa(name)")
      .eq("project_id", projectId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of ((pdRows ?? []) as any[])) {
      if (r.desa?.name) desaByName.set(r.desa.name.toLowerCase().trim(), r.desa_id);
    }
  }

  async function attachToProject(
    userId: string,
    role: string,
    desaName: string | null | undefined,
  ) {
    if (!projectId) return;
    const desaId =
      role === "peserta" && desaName
        ? desaByName.get(desaName.toLowerCase().trim()) ?? null
        : null;
    // Upsert membership - a peserta can belong to multiple projects, and
    // re-import shouldn't duplicate. (project_id,user_id,role) is unique.
    const { error } = await admin.from("project_memberships").upsert(
      {
        project_id: projectId,
        user_id: userId,
        role,
        desa_id: desaId,
        status: "active",
      },
      { onConflict: "project_id,user_id,role" },
    );
    if (!error) attached++;
  }

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
          `${row.full_name}: tidak ada email atau NIK - tidak bisa create auth user.`,
        );
        continue;
      }
      email = `nik+${row.nik}@peserta.atourin.id`;
      emailArtificial = true;
    }

    // 2. Existing user → attach to project (multi-project membership)
    //    instead of silently skipping, so re-using a peserta works.
    const { data: existing } = await admin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      skipped++;
      await attachToProject(
        (existing as { id: string }).id,
        row.role,
        row.desa_name,
      );
      continue;
    }

    // 3. Create auth user (email-confirmed so they can log in once we set password)
    const generatedPassword = cryptoRandomPassword();
    const { data: authResult, error: authError } =
      await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password: generatedPassword,
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
    const userPayload: Record<string, unknown> = {
      id: authResult.user.id,
      full_name: row.full_name,
      email,
      email_artificial: emailArtificial,
      phone: row.phone || null,
      nik: row.nik || null,
      gender: row.gender || null,
      birthdate: row.birthdate || null,
      global_role: row.role,
    };
    if (row.role === "narasumber") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = row as any;
      userPayload.kategori_narasumber = r.kategori_narasumber || null;
      userPayload.kompetensi = r.kompetensi || null;
      userPayload.jabatan = r.jabatan || null;
      userPayload.instansi = r.instansi || null;
      userPayload.kota = r.kota || null;
    }
    const { error: insertError } = await admin.from("users").insert(userPayload);

    if (insertError) {
      // Roll back auth user to avoid orphan
      await admin.auth.admin.deleteUser(authResult.user.id);
      errors.push(`${row.full_name}: ${insertError.message}`);
      continue;
    }

    created++;
    await attachToProject(authResult.user.id, row.role, row.desa_name);

    if (!emailArtificial) {
      credentials.push({
        id: authResult.user.id,
        full_name: row.full_name,
        email,
        password: generatedPassword,
      });
    }

    // 5. Send invite email (best-effort) - includes credentials
    if (parsed.data.send_invites && !emailArtificial && transporter && fromEmail) {
      try {
        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: email,
          subject: `Akun login Anda di ${appName}`,
          html: invitationHtml(
            row.full_name,
            email,
            generatedPassword,
            appName,
            appUrl,
          ),
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
    attached,
    invites_sent: invitesSent,
    invites_failed: invitesFailed,
    errors: errors.slice(0, 20),
    credentials,
  };
}

function cryptoRandomPassword(): string {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString("base64").replace(/[+/=]/g, "_");
}
