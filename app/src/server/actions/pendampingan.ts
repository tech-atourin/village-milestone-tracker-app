"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as XLSX from "xlsx";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser, requireRole } from "@/lib/auth/rbac";
import { parseBulkRows } from "@/lib/excel/bulk-import";
import { sanitizeAuthUser } from "@/lib/auth/sanitize";

const createSchema = z.object({
  project_id: z.string().uuid(),
  // Boleh null untuk project pelaku_pariwisata (tanpa afiliasi desa).
  project_desa_id: z.string().uuid().nullable().optional(),
  day_number: z.number().int().min(1).max(60),
  session_date: z.string().min(8),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  materi: z.string().max(2000).optional().nullable(),
});

export async function createSession(input: z.input<typeof createSchema>) {
  const user = await requireRole("narasumber", "superadmin");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("pendampingan_sessions")
    .insert({
      ...parsed.data,
      project_desa_id: parsed.data.project_desa_id ?? null,
      narasumber_id: user.id,
      status: "draft",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/narasumber/sesi");
  return { ok: true, id: (data as { id: string }).id };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  materi: z.string().max(5000).optional().nullable(),
  maksud_tujuan: z.string().max(5000).optional().nullable(),
  aktivitas: z.array(z.string()).optional().nullable(),
  output_sesi: z.array(z.string()).optional().nullable(),
  tindak_lanjut: z.array(z.string()).optional().nullable(),
  kondisi_sebelum: z.array(z.string()).optional().nullable(),
  kondisi_setelah: z.array(z.string()).optional().nullable(),
  rekomendasi: z.array(z.string()).optional().nullable(),
});

export async function updateSession(input: z.input<typeof updateSchema>) {
  await requireRole("narasumber", "superadmin");
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const { id, ...rest } = parsed.data;
  const supabase = createClient();
  const { error } = await supabase
    .from("pendampingan_sessions")
    .update(rest)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/narasumber/sesi/${id}`);
  return { ok: true };
}

export async function submitSession(sessionId: string) {
  await requireRole("narasumber", "superadmin");
  const supabase = createClient();
  const { error } = await supabase
    .from("pendampingan_sessions")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) return { error: error.message };
  revalidatePath(`/narasumber/sesi/${sessionId}`);
  return { ok: true };
}

const attendanceSchema = z.object({
  session_id: z.string().uuid(),
  entries: z.array(
    z.object({
      user_id: z.string().uuid(),
      status: z.enum(["hadir", "izin", "sakit", "tidak_hadir"]),
      note: z.string().max(500).optional().nullable(),
    }),
  ),
});

export async function setAttendance(input: z.input<typeof attendanceSchema>) {
  await requireRole("narasumber", "superadmin");
  const parsed = attendanceSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();
  // Wipe + insert (simple replace strategy)
  await supabase
    .from("pendampingan_attendance")
    .delete()
    .eq("session_id", parsed.data.session_id);
  if (parsed.data.entries.length > 0) {
    const rows = parsed.data.entries.map((e) => ({
      session_id: parsed.data.session_id,
      user_id: e.user_id,
      status: e.status,
      note: e.note ?? null,
    }));
    const { error } = await supabase
      .from("pendampingan_attendance")
      .insert(rows);
    if (error) return { error: error.message };
  }
  revalidatePath(`/narasumber/sesi/${parsed.data.session_id}`);
  return { ok: true };
}

const evidenceSchema = z.object({
  session_id: z.string().uuid(),
  filename: z.string().min(1).max(200),
  mime_type: z.string().min(1).max(100),
  base64: z.string().min(1),
  caption: z.string().max(500).optional().nullable(),
});

export async function uploadSessionEvidence(
  input: z.input<typeof evidenceSchema>,
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = evidenceSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();

  const bytes = Buffer.from(parsed.data.base64, "base64");
  if (bytes.byteLength > 20 * 1024 * 1024) {
    return { error: "File terlalu besar (maks 20 MB)" };
  }
  const safe = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `pendampingan/${parsed.data.session_id}/${Date.now()}-${safe}`;
  const { error: upErr } = await supabase.storage
    .from("vmt-evidence")
    .upload(path, bytes, {
      contentType: parsed.data.mime_type,
      upsert: false,
    });
  if (upErr) return { error: upErr.message };

  // Look up project_desa_id from session
  const { data: ses } = await supabase
    .from("pendampingan_sessions")
    .select("project_desa_id")
    .eq("id", parsed.data.session_id)
    .maybeSingle();
  const projectDesaId = (ses as { project_desa_id: string } | null)
    ?.project_desa_id;

  const { data: ev, error: insErr } = await supabase
    .from("evidence_files")
    .insert({
      project_desa_id: projectDesaId,
      uploaded_by: user.id,
      file_url: path,
      file_type:
        parsed.data.mime_type.startsWith("image/") ? "image" : "document",
      file_size_bytes: bytes.byteLength,
      original_filename: parsed.data.filename,
      caption: parsed.data.caption ?? null,
    })
    .select("id")
    .single();
  if (insErr || !ev) {
    await supabase.storage.from("vmt-evidence").remove([path]);
    return { error: insErr?.message ?? "Gagal simpan metadata" };
  }
  await supabase.from("evidence_tags").insert({
    evidence_id: (ev as { id: string }).id,
    tag_type: "pendampingan_session",
    tag_target_id: parsed.data.session_id,
    tagged_by: user.id,
  });
  revalidatePath(`/narasumber/sesi/${parsed.data.session_id}`);
  return { ok: true };
}

// =====================================================
// Delete a session evidence file (storage + DB)
// =====================================================
const deleteEvidenceSchema = z.object({
  session_id: z.string().uuid(),
  file_path: z.string().min(1),
});

export async function deleteSessionEvidence(
  input: z.input<typeof deleteEvidenceSchema>,
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = deleteEvidenceSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };
  const supabase = createClient();

  const { data: ev } = await supabase
    .from("evidence_files")
    .select("id, uploaded_by")
    .eq("file_url", parsed.data.file_path)
    .maybeSingle();
  if (!ev) return { error: "File tidak ditemukan" };
  const row = ev as { id: string; uploaded_by: string };

  if (row.uploaded_by !== user.id && user.global_role !== "superadmin")
    return { error: "Tidak diizinkan menghapus file ini" };

  await supabase.storage.from("vmt-evidence").remove([parsed.data.file_path]);
  await supabase
    .from("evidence_tags")
    .delete()
    .eq("evidence_id", row.id)
    .eq("tag_type", "pendampingan_session")
    .eq("tag_target_id", parsed.data.session_id);
  const { error: delErr } = await supabase
    .from("evidence_files")
    .delete()
    .eq("id", row.id);
  if (delErr) return { error: delErr.message };

  revalidatePath(`/narasumber/sesi/${parsed.data.session_id}`);
  return { ok: true };
}

// =====================================================
// Bulk import peserta dari Excel ke desa di project ini.
// Dipanggil dari halaman editor sesi narasumber - narasumber boleh add
// peserta untuk desa yang sedang mereka dampingi.
// Excel kolom: full_name, email, phone, nik, gender, birthdate, jabatan
// =====================================================
const bulkPesertaSchema = z.object({
  project_desa_id: z.string().uuid(),
  base64: z.string().min(1),
});

export type BulkPesertaResult = {
  error?: string;
  created?: number;
  attached?: number;
  skipped?: number;
  errors?: string[];
};

function cryptoRandomPassword(): string {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString("base64").replace(/[+/=]/g, "_");
}

export async function bulkImportPesertaToDesa(
  input: z.input<typeof bulkPesertaSchema>,
): Promise<BulkPesertaResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Tidak terautentikasi" };
  const parsed = bulkPesertaSchema.safeParse(input);
  if (!parsed.success) return { error: "Input tidak valid" };

  const admin = createAdminClient();
  // Resolve project + desa from project_desa, verify narasumber/admin
  // is authorized to add peserta to this desa.
  const { data: pd } = await admin
    .from("project_desa")
    .select("id, project_id, desa_id, desa:desa(name)")
    .eq("id", parsed.data.project_desa_id)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdRow = pd as any;
  if (!pdRow) return { error: "project_desa tidak ditemukan" };

  if (user.global_role === "narasumber") {
    const { data: m } = await admin
      .from("project_memberships")
      .select("desa_id")
      .eq("project_id", pdRow.project_id)
      .eq("user_id", user.id)
      .eq("role", "narasumber")
      .eq("status", "active");
    const rows = (m ?? []) as Array<{ desa_id: string | null }>;
    const allowed = rows.some(
      (r) => r.desa_id === pdRow.desa_id || r.desa_id === null,
    );
    if (!allowed) return { error: "Anda tidak mendampingi desa ini." };
  } else if (
    user.global_role !== "superadmin" &&
    user.global_role !== "mitra_admin"
  ) {
    return { error: "Tidak diizinkan" };
  }

  // Parse Excel
  let rawRows: Array<Record<string, unknown>> = [];
  try {
    const buf = Buffer.from(parsed.data.base64, "base64");
    const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rawRows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      blankrows: false,
    }) as Array<Record<string, unknown>>;
  } catch {
    return { error: "Gagal baca file. Pastikan format .xlsx dengan header baris pertama." };
  }
  if (rawRows.length === 0) return { error: "File kosong, tidak ada baris data." };

  const parsedRows = parseBulkRows(rawRows);
  const errors: string[] = [];
  let created = 0;
  let attached = 0;
  let skipped = 0;

  for (const r of parsedRows) {
    if (!r.ok || !r.data) {
      skipped++;
      if (r.errors?.length)
        errors.push(`Baris ${r.rowNumber}: ${r.errors.join(", ")}`);
      continue;
    }
    const row = r.data;
    // Resolve email - fall back to NIK pseudo-email
    let email = (row.email as string | null | undefined)?.trim().toLowerCase() || null;
    let emailArtificial = false;
    if (!email) {
      if (!row.nik) {
        skipped++;
        errors.push(`${row.full_name}: tidak ada email atau NIK`);
        continue;
      }
      email = `nik+${row.nik}@peserta.atourin.id`;
      emailArtificial = true;
    }
    // Existing user?
    const { data: existing } = await admin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    let userId: string;
    if (existing) {
      userId = (existing as { id: string }).id;
      skipped++;
    } else {
      const password = cryptoRandomPassword();
      const { data: authRes, error: authErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password,
        user_metadata: { full_name: row.full_name, imported: true },
      });
      if (authErr || !authRes.user) {
        errors.push(`${row.full_name}: ${authErr?.message ?? "auth create gagal"}`);
        continue;
      }
      userId = authRes.user.id;
      await sanitizeAuthUser(userId);
      const { error: insErr } = await admin.from("users").insert({
        id: userId,
        full_name: row.full_name,
        email,
        email_artificial: emailArtificial,
        phone: row.phone || null,
        nik: row.nik || null,
        gender: row.gender || null,
        birthdate: row.birthdate || null,
        jabatan: (row as Record<string, unknown>).jabatan || null,
        global_role: "peserta",
        representing_desa_id: pdRow.desa_id,
      });
      if (insErr) {
        await admin.auth.admin.deleteUser(userId);
        errors.push(`${row.full_name}: ${insErr.message}`);
        continue;
      }
      created++;
    }
    // Attach to project_memberships
    const { error: mErr } = await admin.from("project_memberships").upsert(
      {
        project_id: pdRow.project_id,
        user_id: userId,
        role: "peserta",
        desa_id: pdRow.desa_id,
        status: "active",
      },
      { onConflict: "project_id,user_id,role,desa_id" },
    );
    if (!mErr) attached++;
  }

  revalidatePath(`/narasumber/sesi`);
  return { created, attached, skipped, errors: errors.slice(0, 20) };
}
